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


# ──────────────────────────────────────────────
# Endpoint 2: Sequential Messages (MAIN FEATURE)
# ──────────────────────────────────────────────

def _should_skip_part(part: SequencePartRequest) -> bool:
    """Return True if the part carries no meaningful payload and should be skipped."""
    if part.type == "text":
        return not part.text or not part.text.strip()
    if part.type == "image":
        return not part.imageLink or not part.imageLink.strip()
    if part.type == "video":
        return not part.videoLink or not part.videoLink.strip()
    return True


def _delay_for_part_type(part_type: str) -> int:
    """Return the delay in milliseconds that should follow a sent part."""
    if part_type in ("image", "video"):
        return min(DELAY_AFTER_MEDIA_MS, MAX_DELAY_MS)
    return min(DELAY_AFTER_TEXT_MS, MAX_DELAY_MS)


def _build_form_fields(
    device_uuid: str,
    chat_id: str,
    part: SequencePartRequest,
) -> Dict[str, str]:
    """Build the Zentra multipart/form-data fields for a single part."""
    base = {
        "device_uuid": device_uuid,
        "type_contact": "numbers",
        "ids": chat_id,
    }

    if part.type == "text":
        base["type_message"] = "text"
        base["text_message"] = part.text.strip()

    elif part.type == "image":
        base["type_message"] = "image"
        base["media_url"] = part.imageLink.strip()
        base["text_message"] = part.caption or ""

    elif part.type == "video":
        base["type_message"] = "video"
        base["media_url"] = part.videoLink.strip()
        base["text_message"] = part.caption or ""

    return base


@router.post(
    "/messages/send-sequence",
    response_model=SendSequenceResponse,
    status_code=200,
    summary="Send an ordered sequence of text, image, and video messages",
)
async def send_sequence(req: SendSequenceRequest):
    """
    Accept an ordered array of message parts (text, image, video) and send
    them **one by one, sequentially** to a WhatsApp chat via the Zentra API.

    Key guarantees
    ──────────────
    * **Strict ordering** – Part N+1 is never sent before Part N completes.
    * **Controlled delays** – 2.5 s after text, 6 s after image/video,
      capped at 15 s.  No delay after the last part.
    * **Per-chat locking** – While a sequence is in-flight for a given
      ``chat_id``, any concurrent request for the *same* chat_id will
      block until the first sequence finishes.  Different chat_ids run
      in parallel.
    * **Resilient** – A failed part is logged but does not abort the
      remaining parts.
    * **Empty parts are skipped** – blank text or missing URLs are
      silently skipped.
    """
    chat_id = req.chat_id
    lock = _get_chat_lock(chat_id)

    logger.info(
        "send-sequence START  |  chat=%s  |  parts=%d",
        chat_id,
        len(req.parts),
    )

    results: List[SequencePartResult] = []
    successful = 0
    failed = 0
    skipped = 0

    # Acquire per-chat lock so no two sequences interleave for the same chat
    async with lock:
        for idx, part in enumerate(req.parts):
            is_last = idx == len(req.parts) - 1

            # ── Skip empty / invalid parts ──────────────────────
            if _should_skip_part(part):
                logger.info(
                    "send-sequence SKIP   |  chat=%s  |  part=%d  |  type=%s",
                    chat_id,
                    idx,
                    part.type,
                )
                results.append(
                    SequencePartResult(
                        part_index=idx,
                        type=part.type,
                        status="skipped",
                        delay_after_ms=0,
                    )
                )
                skipped += 1
                continue

            # ── Build form fields and send ──────────────────────
            form_fields = _build_form_fields(req.device_uuid, chat_id, part)
            delay_ms = 0 if is_last else _delay_for_part_type(part.type)

            try:
                zentra_result = await _send_to_zentra(req.api_key, form_fields)

                if zentra_result["success"]:
                    logger.info(
                        "send-sequence OK     |  chat=%s  |  part=%d  |  type=%s  |  delay=%dms",
                        chat_id,
                        idx,
                        part.type,
                        delay_ms,
                    )
                    results.append(
                        SequencePartResult(
                            part_index=idx,
                            type=part.type,
                            status="success",
                            zentra_response=zentra_result["data"],
                            delay_after_ms=delay_ms,
                        )
                    )
                    successful += 1
                else:
                    error_msg = (
                        f"Zentra returned status {zentra_result['status_code']}"
                    )
                    logger.error(
                        "send-sequence FAIL   |  chat=%s  |  part=%d  |  type=%s  |  error=%s",
                        chat_id,
                        idx,
                        part.type,
                        error_msg,
                    )
                    results.append(
                        SequencePartResult(
                            part_index=idx,
                            type=part.type,
                            status="error",
                            error=error_msg,
                            zentra_response=zentra_result["data"],
                            delay_after_ms=delay_ms,
                        )
                    )
                    failed += 1

            except Exception as exc:
                logger.exception(
                    "send-sequence EXCEPTION  |  chat=%s  |  part=%d  |  type=%s",
                    chat_id,
                    idx,
                    part.type,
                )
                results.append(
                    SequencePartResult(
                        part_index=idx,
                        type=part.type,
                        status="error",
                        error=str(exc),
                        delay_after_ms=delay_ms,
                    )
                )
                failed += 1

            # ── Delay before next part (skip after last) ────────
            if not is_last and delay_ms > 0:
                await asyncio.sleep(delay_ms / 1000.0)

    logger.info(
        "send-sequence DONE   |  chat=%s  |  ok=%d  |  fail=%d  |  skip=%d",
        chat_id,
        successful,
        failed,
        skipped,
    )

    return SendSequenceResponse(
        status="completed",
        chat_id=chat_id,
        total_parts=len(req.parts),
        successful=successful,
        failed=failed,
        skipped=skipped,
        results=results,
    )
