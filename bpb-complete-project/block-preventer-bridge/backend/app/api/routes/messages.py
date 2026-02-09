"""API routes for Message sending and management."""
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.services.message_service import MessageService
from app.services.cooldown_service import CooldownService
from app.schemas.message import (
    OpenChatRequest, ReplyChatRequest, MessageResponse,
    OpenChatResponse, ReplyChatResponse, QueueStatusResponse, AlertResponse
)

router = APIRouter(tags=["Messages"])


@router.post("/packages/{package_id}/messages/open", response_model=dict, status_code=201)
async def send_open_chat(package_id: UUID, data: OpenChatRequest, db: AsyncSession = Depends(get_db)):
    """Send Open Chat message - distributed with rate limiting."""
    service = MessageService(db)
    try:
        result = await service.send_open_chat(package_id, data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/packages/{package_id}/messages/reply", response_model=dict, status_code=201)
async def send_reply_chat(package_id: UUID, data: ReplyChatRequest, db: AsyncSession = Depends(get_db)):
    """Send Reply Chat message - immediate, no rate limits."""
    service = MessageService(db)
    try:
        result = await service.send_reply_chat(package_id, data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/packages/{package_id}/messages", response_model=List[dict])
async def list_messages(
    package_id: UUID,
    status: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List messages with optional filters."""
    service = MessageService(db)
    messages = await service.list_messages(package_id, status=status, mode=mode, limit=limit, offset=offset)
    
    return [{
        "id": str(m.id),
        "package_id": str(m.package_id),
        "message_mode": m.message_mode,
        "message_type": m.message_type,
        "content": m.content[:100] + "..." if len(m.content) > 100 else m.content,
        "status": m.status,
        "total_recipients": m.total_recipients,
        "processed_count": m.processed_count,
        "failed_count": m.failed_count,
        "success_count": m.success_count,
        "created_at": m.created_at.isoformat() if m.created_at else None
    } for m in messages]


@router.get("/packages/{package_id}/messages/{message_id}", response_model=dict)
async def get_message(package_id: UUID, message_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get message details with delivery logs."""
    service = MessageService(db)
    message = await service.get_message(message_id)
    if not message or str(message.package_id) != str(package_id):
        raise HTTPException(status_code=404, detail="Message not found")
    
    delivery_logs = [{
        "id": str(dl.id),
        "profile_id": str(dl.profile_id),
        "recipient": dl.recipient,
        "status": dl.status,
        "attempt_count": dl.attempt_count,
        "error_message": dl.error_message,
        "response_time_ms": dl.response_time_ms,
        "sent_at": dl.sent_at.isoformat() if dl.sent_at else None,
        "created_at": dl.created_at.isoformat() if dl.created_at else None
    } for dl in (message.delivery_logs or [])]
    
    return {
        "id": str(message.id),
        "package_id": str(message.package_id),
        "message_mode": message.message_mode,
        "message_type": message.message_type,
        "content": message.content,
        "media_url": message.media_url,
        "caption": message.caption,
        "status": message.status,
        "total_recipients": message.total_recipients,
        "processed_count": message.processed_count,
        "failed_count": message.failed_count,
        "success_count": message.success_count,
        "distribution_result": message.distribution_result,
        "delivery_logs": delivery_logs,
        "created_at": message.created_at.isoformat() if message.created_at else None
    }


@router.get("/packages/{package_id}/queue", response_model=dict)
async def get_queue_status(package_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get queue status for a package."""
    cooldown_service = CooldownService(db)
    status = await cooldown_service.get_queue_status(package_id)
    return status


@router.get("/packages/{package_id}/analytics", response_model=dict)
async def get_analytics(
    package_id: UUID,
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics data for a package."""
    service = MessageService(db)
    return await service.get_analytics(package_id, days)


@router.get("/alerts", response_model=List[dict])
async def get_alerts(
    package_id: Optional[UUID] = Query(None),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Get system alerts."""
    service = MessageService(db)
    alerts = await service.get_alerts(package_id, unread_only)
    return [{
        "id": str(a.id),
        "package_id": str(a.package_id) if a.package_id else None,
        "profile_id": str(a.profile_id) if a.profile_id else None,
        "alert_type": a.alert_type,
        "severity": a.severity,
        "title": a.title,
        "message": a.message,
        "is_read": a.is_read,
        "is_resolved": a.is_resolved,
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in alerts]


@router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: UUID, db: AsyncSession = Depends(get_db)):
    """Mark an alert as read."""
    service = MessageService(db)
    await service.mark_alert_read(alert_id)
    return {"message": "Alert marked as read"}
