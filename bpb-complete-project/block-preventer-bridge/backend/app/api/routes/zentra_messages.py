"""API routes for direct Zentra message sending (sequential & image reply).

This module provides two endpoints:
1. POST /messages/reply-image  - Send a single image with caption via Zentra
2. POST /messages/send-sequence - Send an ordered sequence of text/image/video parts

These endpoints are designed to be called from n8n workflows and handle
message ordering, delays, and per-chat concurrency control.
"""

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Zentra Direct Messages"])

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────
ZENTRA_API_URL = "https://api.zentramsg.com/v1/messages"
ZENTRA_TIMEOUT_SECONDS = 30
DELAY_AFTER_TEXT_MS = 2500       # 2.5 seconds after text
DELAY_AFTER_MEDIA_MS = 6000      # 6 seconds after image/video
MAX_DELAY_MS = 15000             # hard cap

# ──────────────────────────────────────────────
# Per-chat concurrency locks
# ──────────────────────────────────────────────
_chat_locks: Dict[str, asyncio.Lock] = {}


def _get_chat_lock(chat_id: str) -> asyncio.Lock:
    """Return (or create) an asyncio.Lock for the given chat_id."""
    if chat_id not in _chat_locks:
        _chat_locks[chat_id] = asyncio.Lock()
    return _chat_locks[chat_id]


# ──────────────────────────────────────────────
# Pydantic request / response models
# ──────────────────────────────────────────────

class ReplyImageRequest(BaseModel):
    """Request body for POST /messages/reply-image."""
    device_uuid: str = Field(..., min_length=1, description="Zentra device UUID")
    api_key: str = Field(..., min_length=1, description="Zentra API token")
    chat_id: str = Field(..., min_length=1, description="Recipient phone number")
    image_url: str = Field(..., min_length=1, description="Public URL of the image")
    caption: Optional[str] = Field(default="", description="Optional caption for the image")


class ReplyImageResponse(BaseModel):
    """Response body for POST /messages/reply-image."""
    status: str
    message: str
    zentra_response: Optional[Dict[str, Any]] = None


class SequencePartRequest(BaseModel):
    """A single part inside a send-sequence request."""
    type: str = Field(..., description="Part type: text | image | video")
    text: Optional[str] = Field(default=None, description="Text content (for type=text)")
    imageLink: Optional[str] = Field(default=None, description="Image URL (for type=image)")
    videoLink: Optional[str] = Field(default=None, description="Video URL (for type=video)")
    caption: Optional[str] = Field(default=None, description="Caption for image/video")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"text", "image", "video"}
        if v not in allowed:
            raise ValueError(f"Part type must be one of {allowed}, got '{v}'")
        return v


class SendSequenceRequest(BaseModel):
    """Request body for POST /messages/send-sequence."""
    device_uuid: str = Field(..., min_length=1, description="Zentra device UUID")
    api_key: str = Field(..., min_length=1, description="Zentra API token")
    chat_id: str = Field(..., min_length=1, description="Recipient phone number")
    parts: List[SequencePartRequest] = Field(..., min_length=1, description="Ordered message parts")


class SequencePartResult(BaseModel):
    """Result for a single part in the sequence response."""
    part_index: int
    type: str
    status: str  # "success" | "error" | "skipped"
    zentra_response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    delay_after_ms: int = 0


class SendSequenceResponse(BaseModel):
    """Response body for POST /messages/send-sequence."""
    status: str  # "completed"
    chat_id: str
    total_parts: int
    successful: int
    failed: int
    skipped: int = 0
    results: List[SequencePartResult]


# ──────────────────────────────────────────────
# Helper: call Zentra API
# ──────────────────────────────────────────────

async def _send_to_zentra(
    api_key: str,
    form_fields: Dict[str, str],
) -> Dict[str, Any]:
    """
    POST multipart/form-data to the Zentra messages endpoint.

    Returns a dict with keys: success (bool), status_code (int),
    data (dict), response_time_ms (int).
    """
    headers = {
        "x-api-token": api_key,
        "accept": "*/*",
    }
    start = time.time()

    try:
        async with aiohttp.ClientSession() as session:
            form = aiohttp.FormData()
            for key, value in form_fields.items():
                form.add_field(key, str(value))

            async with session.post(
                ZENTRA_API_URL,
                data=form,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=ZENTRA_TIMEOUT_SECONDS),
            ) as resp:
                elapsed_ms = int((time.time() - start) * 1000)
                try:
                    body = await resp.json()
                except Exception:
                    body = {"raw_response": await resp.text()}

                return {
                    "success": resp.status in (200, 201),
                    "status_code": resp.status,
                    "data": body,
                    "response_time_ms": elapsed_ms,
                }
    except aiohttp.ClientError as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        logger.error("Zentra API client error: %s", exc)
        return {
            "success": False,
            "status_code": 0,
            "data": {"error": str(exc)},
            "response_time_ms": elapsed_ms,
        }
    except Exception as exc:
        logger.error("Unexpected error calling Zentra: %s", exc)
        return {
            "success": False,
            "status_code": 0,
            "data": {"error": str(exc)},
            "response_time_ms": 0,
        }


# ──────────────────────────────────────────────
# Endpoint 1: Reply with Image & Caption
# ──────────────────────────────────────────────

@router.post(
    "/messages/reply-image",
    response_model=ReplyImageResponse,
    status_code=200,
    summary="Send a single image message with optional caption",
)
async def reply_image(req: ReplyImageRequest):
    """
    Send one image message (with an optional caption) to a WhatsApp chat
    via the Zentra API.

    The `device_uuid` and `api_key` are supplied per-request because
    different n8n profiles may use different Zentra credentials.
    """
    logger.info(
        "reply-image  |  chat=%s  |  image=%s  |  caption=%s",
        req.chat_id,
        req.image_url,
        (req.caption or "")[:60],
    )

    form_fields = {
        "device_uuid": req.device_uuid,
        "type_contact": "numbers",
        "ids": req.chat_id,
        "type_message": "image",
        "media_url": req.image_url,
        "text_message": req.caption or "",
    }

    result = await _send_to_zentra(req.api_key, form_fields)

    if result["success"]:
        return ReplyImageResponse(
            status="success",
            message="Image message sent successfully",
            zentra_response=result["data"],
        )
    else:
        logger.error(
            "reply-image FAILED  |  chat=%s  |  status=%s  |  body=%s",
            req.chat_id,
            result["status_code"],
            result["data"],
        )
        return ReplyImageResponse(
            status="error",
            message=f"Zentra API returned status {result['status_code']}",
            zentra_response=result["data"],
        )
