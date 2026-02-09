"""Scheduling Service - Handles message scheduling and queue processing."""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.models import (
    Message, MessageQueue, Profile, ProfileStatistics, Package
)

logger = logging.getLogger(__name__)


class SchedulingService:
    """Manages message scheduling and queue processing orchestration."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def schedule_message(self, package_id: UUID, data: dict) -> dict:
        """
        Schedule a message for future delivery.
        
        data should contain:
        - scheduled_at: ISO datetime string for when to send
        - recipients: list of phone numbers
        - content: message text
        - message_type: text/template/media
        - drip_mode: optional, if True spreads recipients over time
        - drip_interval_minutes: optional, interval between drip sends (default 30)
        """
        scheduled_at = data.get("scheduled_at")
        if not scheduled_at:
            raise ValueError("scheduled_at is required for scheduling")

        if isinstance(scheduled_at, str):
            scheduled_at = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))

        if scheduled_at <= datetime.now(timezone.utc):
            raise ValueError("scheduled_at must be in the future")

        recipients = data.get("recipients", [])
        drip_mode = data.get("drip_mode", False)
        drip_interval_minutes = data.get("drip_interval_minutes", 30)
        
        if drip_mode and len(recipients) > 1:
            # Create separate scheduled messages for each recipient with staggered times
            messages_created = []
            for i, recipient in enumerate(recipients):
                send_time = scheduled_at + timedelta(minutes=drip_interval_minutes * i)
                message = Message(
                    package_id=package_id,
                    message_mode="open",
                    message_type=data.get("message_type", "text"),
                    content=data.get("content", ""),
                    media_url=data.get("media_url"),
                    caption=data.get("caption"),
                    recipients=[recipient],
                    status="scheduled",
                    scheduled_at=send_time,
                    total_recipients=1
                )
                self.db.add(message)
                messages_created.append({
                    "recipient": recipient,
                    "scheduled_at": send_time.isoformat()
                })
            await self.db.flush()
            
            total_duration_minutes = drip_interval_minutes * (len(recipients) - 1)
            return {
                "status": "scheduled",
                "mode": "drip",
                "total_recipients": len(recipients),
                "drip_interval_minutes": drip_interval_minutes,
                "first_send": scheduled_at.isoformat(),
                "last_send": (scheduled_at + timedelta(minutes=total_duration_minutes)).isoformat(),
                "total_duration_minutes": total_duration_minutes,
                "note": f"Messages will be sent every {drip_interval_minutes} minutes starting at scheduled time"
            }
        else:
            # Single message with all recipients
            message = Message(
                package_id=package_id,
                message_mode="open",
                message_type=data.get("message_type", "text"),
                content=data.get("content", ""),
                media_url=data.get("media_url"),
                caption=data.get("caption"),
                recipients=recipients,
                status="scheduled",
                scheduled_at=scheduled_at,
                total_recipients=len(recipients)
            )
            self.db.add(message)
            await self.db.flush()

            return {
                "message_id": str(message.id),
                "status": "scheduled",
                "mode": "bulk",
                "scheduled_at": scheduled_at.isoformat(),
                "total_recipients": len(recipients),
                "note": "Message will be processed at the scheduled time"
            }

    async def process_scheduled_messages(self):
        """
        Check for scheduled messages that are ready to be sent.
        Called periodically by the background task runner.
        """
        now = datetime.now(timezone.utc)

        result = await self.db.execute(
            select(Message).where(
                Message.status == "scheduled",
                Message.scheduled_at <= now
            ).order_by(Message.scheduled_at)
            .limit(5)
        )
        messages = result.scalars().all()

        processed = 0
        for message in messages:
            try:
                message.status = "queued"
                await self.db.flush()

                # Import here to avoid circular imports
                from app.services.message_service import MessageService
                msg_service = MessageService(self.db)

                data = {
                    "recipients": message.recipients or [],
                    "content": message.content,
                    "message_type": message.message_type,
                    "media_url": message.media_url,
                    "caption": message.caption,
                }

                # Re-use the open chat flow to distribute and queue
                from app.services.distribution_service import DistributionService
                from app.services.cooldown_service import CooldownService

                pkg_result = await self.db.execute(
                    select(Package).where(Package.id == message.package_id)
                )
                package = pkg_result.scalar_one_or_none()
                if not package or package.status != "active":
                    message.status = "failed"
                    await self.db.flush()
                    continue

                dist_service = DistributionService(self.db)
                distribution = await dist_service.distribute(package, message.recipients or [])
                message.distribution_result = distribution

                cooldown_service = CooldownService(self.db)
                base_time = datetime.now(timezone.utc)

                for profile_id_str, profile_recipients in distribution.items():
                    profile_id = UUID(profile_id_str)
                    prof_result = await self.db.execute(
                        select(Profile).where(Profile.id == profile_id)
                    )
                    profile = prof_result.scalar_one_or_none()
                    if not profile:
                        continue

                    cooldown_info = await cooldown_service.calculate_cooldown(package, profile)

                    for i, recipient in enumerate(profile_recipients):
                        send_at = base_time + timedelta(seconds=cooldown_info["cooldown_seconds"] * i)
                        queue_item = MessageQueue(
                            message_id=message.id,
                            profile_id=profile_id,
                            recipient=recipient,
                            message_type=message.message_type,
                            content=message.content,
                            media_url=message.media_url,
                            caption=message.caption,
                            status="waiting",
                            scheduled_send_at=send_at,
                            max_attempts=package.retry_attempts
                        )
                        self.db.add(queue_item)

                message.status = "queued"
                await self.db.flush()
                processed += 1

                logger.info(f"Scheduled message {message.id} now queued for delivery")

            except Exception as e:
                logger.error(f"Error processing scheduled message {message.id}: {e}")
                message.status = "failed"
                await self.db.flush()

        return processed

    async def get_scheduled_messages(self, package_id: UUID) -> list:
        """Get all scheduled (not yet sent) messages for a package."""
        result = await self.db.execute(
            select(Message).where(
                Message.package_id == package_id,
                Message.status == "scheduled"
            ).order_by(Message.scheduled_at)
        )
        messages = result.scalars().all()

        return [
            {
                "id": str(m.id),
                "content": m.content[:100] + "..." if len(m.content) > 100 else m.content,
                "message_type": m.message_type,
                "total_recipients": m.total_recipients,
                "scheduled_at": m.scheduled_at.isoformat() if m.scheduled_at else None,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]

    async def cancel_scheduled_message(self, message_id: UUID) -> bool:
        """Cancel a scheduled message."""
        result = await self.db.execute(
            select(Message).where(
                Message.id == message_id,
                Message.status == "scheduled"
            )
        )
        message = result.scalar_one_or_none()
        if not message:
            return False

        message.status = "cancelled"
        await self.db.flush()
        return True

    async def get_queue_status(self, package_id: UUID) -> dict:
        """Get detailed queue status for a package."""
        # Count by status
        status_result = await self.db.execute(
            select(MessageQueue.status, func.count(MessageQueue.id))
            .where(
                MessageQueue.message_id.in_(
                    select(Message.id).where(Message.package_id == package_id)
                )
            )
            .group_by(MessageQueue.status)
        )
        status_counts = {row[0]: row[1] for row in status_result.all()}

        # Get next scheduled send time
        next_result = await self.db.execute(
            select(func.min(MessageQueue.scheduled_send_at)).where(
                MessageQueue.status == "waiting",
                MessageQueue.message_id.in_(
                    select(Message.id).where(Message.package_id == package_id)
                )
            )
        )
        next_send = next_result.scalar()

        # Active profiles count
        active_result = await self.db.execute(
            select(func.count(Profile.id)).where(
                Profile.package_id == package_id,
                Profile.status == "active"
            )
        )
        active_profiles = active_result.scalar() or 0

        # Scheduled messages count
        scheduled_result = await self.db.execute(
            select(func.count(Message.id)).where(
                Message.package_id == package_id,
                Message.status == "scheduled"
            )
        )
        scheduled_count = scheduled_result.scalar() or 0

        return {
            "queue_size": status_counts.get("waiting", 0),
            "processing": status_counts.get("processing", 0),
            "sent": status_counts.get("sent", 0),
            "failed": status_counts.get("failed", 0),
            "cancelled": status_counts.get("cancelled", 0),
            "scheduled_messages": scheduled_count,
            "active_profiles": active_profiles,
            "next_send_at": next_send.isoformat() if next_send else None,
            "queue_mode": "normal"  # Will be set by auto_adjust_service
        }

    async def get_queue_items(self, package_id: UUID, status_filter: str = None, limit: int = 100) -> list:
        """
        Get detailed queue items for developer debugging.
        Returns items with scheduled times, errors, mode, and profile info.
        """
        from sqlalchemy.orm import selectinload
        
        # Build query for queue items related to this package with message info
        query = (
            select(MessageQueue)
            .join(Message, MessageQueue.message_id == Message.id)
            .where(Message.package_id == package_id)
            .options(
                selectinload(MessageQueue.profile),
                selectinload(MessageQueue.message)
            )
            .order_by(MessageQueue.scheduled_send_at.asc())
            .limit(limit)
        )
        
        if status_filter:
            query = query.where(MessageQueue.status == status_filter)
        
        result = await self.db.execute(query)
        items = result.scalars().all()
        
        now = datetime.now(timezone.utc)
        
        return [
            {
                "id": str(item.id),
                "message_id": str(item.message_id),
                "profile_id": str(item.profile_id),
                "profile_name": item.profile.name if item.profile else "Unknown",
                "recipient": item.recipient,
                "status": item.status,
                "mode": item.message.message_mode if item.message else "open",
                "content": item.content[:100] + "..." if len(item.content or "") > 100 else item.content,
                "scheduled_send_at": item.scheduled_send_at.isoformat() if item.scheduled_send_at else None,
                "seconds_until_send": max(0, int((item.scheduled_send_at - now).total_seconds())) if item.scheduled_send_at and item.scheduled_send_at > now else 0,
                "attempt_count": item.attempt_count,
                "max_attempts": item.max_attempts,
                "last_error": item.last_error,
                "sent_at": item.sent_at.isoformat() if item.sent_at else None,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ]

