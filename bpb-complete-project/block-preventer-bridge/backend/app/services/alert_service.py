"""Alert Service - Business logic for alert management."""
import logging
from uuid import UUID
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.models import Alert

logger = logging.getLogger(__name__)


class AlertService:
    """Handles all alert-related business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_alert(
        self,
        title: str,
        message: str,
        severity: str = "warning",
        alert_type: str = "system",
        package_id: UUID = None,
        profile_id: UUID = None,
    ) -> Alert:
        """Create a new alert."""
        alert = Alert(
            title=title,
            message=message,
            severity=severity,
            alert_type=alert_type,
            package_id=package_id,
            profile_id=profile_id,
        )
        self.db.add(alert)
        await self.db.flush()
        await self.db.refresh(alert)
        return alert

    async def list_alerts(
        self,
        package_id: UUID = None,
        unread_only: bool = False,
        severity: str = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Alert]:
        """List alerts with optional filters."""
        query = select(Alert).order_by(Alert.created_at.desc())

        if package_id:
            query = query.where(Alert.package_id == package_id)
        if unread_only:
            query = query.where(Alert.is_read == False)
        if severity:
            query = query.where(Alert.severity == severity)

        query = query.limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_unread(self, package_id: UUID = None) -> int:
        """Count unread alerts."""
        query = select(func.count(Alert.id)).where(Alert.is_read == False)
        if package_id:
            query = query.where(Alert.package_id == package_id)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def mark_read(self, alert_id: UUID) -> Optional[Alert]:
        """Mark a single alert as read."""
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        if not alert:
            return None
        alert.is_read = True
        await self.db.flush()
        await self.db.refresh(alert)
        return alert

    async def mark_all_read(self, package_id: UUID = None) -> int:
        """Mark all alerts as read. Returns count of updated alerts."""
        query = (
            update(Alert)
            .where(Alert.is_read == False)
            .values(is_read=True)
        )
        if package_id:
            query = query.where(Alert.package_id == package_id)
        result = await self.db.execute(query)
        await self.db.flush()
        return result.rowcount

    async def delete_alert(self, alert_id: UUID) -> bool:
        """Delete an alert."""
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        if not alert:
            return False
        await self.db.delete(alert)
        await self.db.flush()
        return True

    async def delete_all_read(self, package_id: UUID = None) -> int:
        """Delete all read alerts."""
        from sqlalchemy import delete as sql_delete
        query = sql_delete(Alert).where(Alert.is_read == True)
        if package_id:
            query = query.where(Alert.package_id == package_id)
        result = await self.db.execute(query)
        await self.db.flush()
        return result.rowcount

    async def delete_all_alerts(self, package_id: UUID = None) -> int:
        """Delete all alerts (optionally filtered by package)."""
        from sqlalchemy import delete as sql_delete
        query = sql_delete(Alert)
        if package_id:
            query = query.where(Alert.package_id == package_id)
        result = await self.db.execute(query)
        await self.db.flush()
        return result.rowcount
