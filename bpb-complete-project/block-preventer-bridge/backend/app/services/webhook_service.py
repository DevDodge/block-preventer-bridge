"""Webhook Notification Service - Sends webhook notifications for events."""
import logging
import httpx
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import SystemSettings

logger = logging.getLogger(__name__)


class WebhookService:
    """Sends webhook notifications for important events."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_notification(self, event_type: str, data: dict):
        """
        Send a webhook notification if enabled.
        
        Event types:
        - block_detected
        - profile_paused
        - profile_resumed
        - limits_adjusted
        - high_risk_pattern
        - message_completed
        - queue_empty
        """
        settings = await self._get_settings()
        if not settings or not settings.webhook_enabled or not settings.webhook_url:
            return

        payload = {
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    settings.webhook_url,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "X-BPB-Event": event_type,
                        "User-Agent": "BlockPreventerBridge/1.0"
                    }
                )
                if response.status_code >= 400:
                    logger.warning(f"Webhook returned {response.status_code}: {response.text[:200]}")
                else:
                    logger.info(f"Webhook sent successfully: {event_type}")
        except Exception as e:
            logger.error(f"Webhook notification failed: {e}")

    async def _get_settings(self):
        """Get system settings."""
        result = await self.db.execute(select(SystemSettings))
        return result.scalar_one_or_none()
