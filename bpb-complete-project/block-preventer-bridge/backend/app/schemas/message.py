"""Pydantic schemas for Message operations."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class OpenChatRequest(BaseModel):
    message_type: str = Field(default="text", description="text, image, voice, document, video")
    content: str = Field(..., min_length=1)
    media_url: Optional[str] = None
    caption: Optional[str] = None
    recipients: List[str] = Field(..., min_length=1)
    scheduled_at: Optional[datetime] = None
    send_immediately: bool = Field(default=False, description="If True, sends the first recipient's message immediately")
    profileNum: Optional[str] = Field(default=None, description="Phone number of a specific profile to use. If provided, bypasses distribution and sends all recipients through this profile only.")


class ReplyChatRequest(BaseModel):
    message_type: str = Field(default="text")
    content: str = Field(..., min_length=1)
    media_url: Optional[str] = None
    caption: Optional[str] = None
    recipient: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None


class DeliveryLogResponse(BaseModel):
    id: UUID
    message_id: UUID
    profile_id: UUID
    recipient: str
    zentra_message_id: Optional[str]
    message_mode: str
    status: str
    attempt_count: int
    error_message: Optional[str]
    response_time_ms: Optional[int]
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: UUID
    package_id: UUID
    message_mode: str
    message_type: str
    content: str
    media_url: Optional[str]
    caption: Optional[str]
    status: str
    scheduled_at: Optional[datetime]
    total_recipients: int
    processed_count: int
    failed_count: int
    success_count: int
    distribution_result: Optional[dict]
    delivery_logs: List[DeliveryLogResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    id: UUID
    package_id: UUID
    message_mode: str
    message_type: str
    content: str
    status: str
    total_recipients: int
    processed_count: int
    failed_count: int
    success_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class OpenChatResponse(BaseModel):
    message_id: UUID
    mode: str = "open"
    status: str
    total_recipients: int
    distribution: dict = {}
    estimated_completion: Optional[str] = None
    limits_status: dict = {}


class ReplyChatResponse(BaseModel):
    message_id: UUID
    mode: str = "reply"
    status: str
    sent_at: Optional[datetime] = None
    profile_used: Optional[str] = None
    delivery_time_ms: Optional[int] = None
    note: str = "Reply messages bypass all rate limits"


class QueueStatusResponse(BaseModel):
    total_waiting: int = 0
    total_processing: int = 0
    queue_mode: str = "normal"
    next_send_in_seconds: Optional[int] = None
    eta_all_seconds: Optional[int] = None
    cooldown_info: dict = {}


class AlertResponse(BaseModel):
    id: UUID
    package_id: Optional[UUID]
    profile_id: Optional[UUID]
    alert_type: str
    severity: str
    title: str
    message: str
    is_read: bool
    is_resolved: bool
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
