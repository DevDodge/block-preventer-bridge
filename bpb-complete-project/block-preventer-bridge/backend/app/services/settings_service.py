"""Settings Service - Manages global system settings persistence."""
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.models import SystemSettings

logger = logging.getLogger(__name__)

# Default settings
DEFAULT_SETTINGS = {
    "global_cooldown_min": 300,
    "global_cooldown_max": 900,
    "max_daily_messages_global": 500,
    "auto_pause_enabled": True,
    "auto_pause_failure_threshold": 5,
    "auto_pause_success_rate_threshold": 70.0,
    "block_detection_enabled": True,
    "risk_alert_threshold": 60,
    "auto_adjust_limits_global": True,
    "active_hours_start": "04:00",
    "active_hours_end": "00:00",
    "webhook_url": "",
    "webhook_enabled": False,
    "notification_email": "",
    "email_notifications_enabled": False,
    "theme": "dark",
    "timezone": "UTC",
}


class SettingsService:
    """Manages global system settings."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self) -> dict:
        """Get all system settings, creating defaults if none exist."""
        result = await self.db.execute(select(SystemSettings))
        settings = result.scalar_one_or_none()

        if not settings:
            # Create default settings
            settings = SystemSettings(**DEFAULT_SETTINGS)
            self.db.add(settings)
            await self.db.flush()

        return {
            "id": str(settings.id),
            "global_cooldown_min": settings.global_cooldown_min,
            "global_cooldown_max": settings.global_cooldown_max,
            "max_daily_messages_global": settings.max_daily_messages_global,
            "auto_pause_enabled": settings.auto_pause_enabled,
            "auto_pause_failure_threshold": settings.auto_pause_failure_threshold,
            "auto_pause_success_rate_threshold": settings.auto_pause_success_rate_threshold,
            "block_detection_enabled": settings.block_detection_enabled,
            "risk_alert_threshold": settings.risk_alert_threshold,
            "auto_adjust_limits_global": settings.auto_adjust_limits_global,
            "active_hours_start": settings.active_hours_start,
            "active_hours_end": settings.active_hours_end,
            "webhook_url": settings.webhook_url or "",
            "webhook_enabled": settings.webhook_enabled,
            "notification_email": settings.notification_email or "",
            "email_notifications_enabled": settings.email_notifications_enabled,
            "theme": settings.theme or "dark",
            "timezone": settings.timezone or "UTC",
            "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
        }

    async def update_settings(self, data: dict) -> dict:
        """Update system settings."""
        result = await self.db.execute(select(SystemSettings))
        settings = result.scalar_one_or_none()

        if not settings:
            settings = SystemSettings(**DEFAULT_SETTINGS)
            self.db.add(settings)
            await self.db.flush()

        # Update only provided fields
        allowed_fields = set(DEFAULT_SETTINGS.keys())
        for key, value in data.items():
            if key in allowed_fields and hasattr(settings, key):
                setattr(settings, key, value)

        settings.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

        logger.info(f"System settings updated: {list(data.keys())}")

        return await self.get_settings()
