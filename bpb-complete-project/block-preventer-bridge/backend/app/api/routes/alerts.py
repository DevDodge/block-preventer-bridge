"""Alert API routes."""
import logging
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.services.alert_service import AlertService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Alerts"])


def _alert_to_dict(alert) -> dict:
    """Convert Alert ORM object to dict."""
    return {
        "id": str(alert.id),
        "package_id": str(alert.package_id) if alert.package_id else None,
        "profile_id": str(alert.profile_id) if alert.profile_id else None,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "title": alert.title,
        "message": alert.message,
        "is_read": alert.is_read,
        "is_resolved": alert.is_resolved,
        "read_at": alert.created_at.isoformat() if alert.is_read else None,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    }


@router.get("/alerts")
async def list_alerts(
    package_id: Optional[str] = Query(None),
    unread_only: Optional[bool] = Query(False),
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List alerts with optional filters."""
    service = AlertService(db)
    pkg_uuid = UUID(package_id) if package_id else None
    alerts = await service.list_alerts(
        package_id=pkg_uuid,
        unread_only=unread_only,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    return [_alert_to_dict(a) for a in alerts]


@router.get("/alerts/count")
async def count_alerts(
    package_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get count of unread alerts."""
    service = AlertService(db)
    pkg_uuid = UUID(package_id) if package_id else None
    count = await service.count_unread(package_id=pkg_uuid)
    return {"unread_count": count}


@router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark a single alert as read."""
    service = AlertService(db)
    alert = await service.mark_read(UUID(alert_id))
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _alert_to_dict(alert)


@router.patch("/alerts/read-all")
async def mark_all_alerts_read(
    package_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Mark all alerts as read."""
    service = AlertService(db)
    pkg_uuid = UUID(package_id) if package_id else None
    count = await service.mark_all_read(package_id=pkg_uuid)
    return {"updated": count}


# NOTE: delete-all MUST come before /{alert_id} to avoid route conflict
@router.delete("/alerts/delete-all")
async def delete_all_alerts(
    package_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Delete all alerts (optionally filtered by package)."""
    service = AlertService(db)
    pkg_uuid = UUID(package_id) if package_id else None
    count = await service.delete_all_alerts(package_id=pkg_uuid)
    return {"deleted": count, "message": f"Successfully deleted {count} alert(s)"}


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single alert."""
    service = AlertService(db)
    deleted = await service.delete_alert(UUID(alert_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"deleted": True}
