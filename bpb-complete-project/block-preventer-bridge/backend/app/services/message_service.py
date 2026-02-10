"""Message Service - Business logic for message sending and management."""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from app.models.models import (
    Message, MessageQueue, DeliveryLog, Profile, ProfileStatistics,
    Package, ConversationRouting, Alert
)
from app.services.distribution_service import DistributionService
from app.services.cooldown_service import CooldownService
from app.integrations.zentra.client import ZentraClient

logger = logging.getLogger(__name__)


class MessageService:
    """Handles all message sending and management."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def send_open_chat(self, package_id: UUID, data: dict) -> dict:
        """
        Send Open Chat message - distributed across profiles with rate limiting.
        """
        # Get package
        pkg_result = await self.db.execute(
            select(Package).where(Package.id == package_id)
        )
        package = pkg_result.scalar_one_or_none()
        if not package:
            raise ValueError("Package not found")
        
        if package.status != "active":
            raise ValueError("Package is not active")
        
        recipients = data.get("recipients", [])
        
        # Create message record
        message = Message(
            package_id=package_id,
            message_mode="open",
            message_type=data.get("message_type", "text"),
            content=data.get("content", ""),
            media_url=data.get("media_url"),
            caption=data.get("caption"),
            recipients=recipients,
            status="queued",
            scheduled_at=data.get("scheduled_at"),
            total_recipients=len(recipients)
        )
        self.db.add(message)
        await self.db.flush()
        
        # Distribute recipients across profiles
        dist_service = DistributionService(self.db)
        distribution = await dist_service.distribute(package, recipients)
        
        message.distribution_result = distribution
        
        # Create queue items for each recipient
        cooldown_service = CooldownService(self.db)
        limits_status = {}
        send_immediately = data.get("send_immediately", False)
        immediate_sent = False
        
        for profile_id_str, profile_recipients in distribution.items():
            profile_id = UUID(profile_id_str)
            
            # Get profile
            prof_result = await self.db.execute(
                select(Profile).options(selectinload(Profile.statistics)).where(Profile.id == profile_id)
            )
            profile = prof_result.scalar_one_or_none()
            if not profile:
                continue
            
            # Calculate cooldown for this profile
            cooldown_info = await cooldown_service.calculate_cooldown(package, profile)
            
            # Create queue items with staggered send times
            # GLOBAL QUEUE AWARENESS: Schedule based on actual message distribution,
            # not just current queue state. Check both:
            # 1. Last pending queue item for this profile (if queue has items)
            # 2. Profile's last_message_at (last time a message was actually sent)
            last_pending_result = await self.db.execute(
                select(func.max(MessageQueue.scheduled_send_at)).where(
                    MessageQueue.profile_id == profile_id,
                    MessageQueue.status == "waiting"
                )
            )
            last_pending_time = last_pending_result.scalar()
            now = datetime.now(timezone.utc)
            cooldown_secs = cooldown_info["cooldown_seconds"]
            
            # Determine the latest reference point for this profile
            reference_time = now
            reference_source = "now"
            
            if last_pending_time and last_pending_time > reference_time:
                reference_time = last_pending_time
                reference_source = "last_pending_queue_item"
            
            if profile.last_message_at:
                # The earliest we can send based on last sent message
                earliest_after_last_sent = profile.last_message_at + timedelta(seconds=cooldown_secs)
                if earliest_after_last_sent > reference_time:
                    reference_time = earliest_after_last_sent
                    reference_source = "last_message_at"
            
            base_time = reference_time
            logger.info(f"Global queue: profile {profile_id} base_time={base_time.isoformat()} "
                       f"(source={reference_source}, cooldown={cooldown_secs}s, "
                       f"last_message_at={profile.last_message_at})")
            
            for i, recipient in enumerate(profile_recipients):
                # If send_immediately is True, send the very first recipient immediately
                if send_immediately and not immediate_sent:
                    # Send immediately via Zentra
                    zentra = ZentraClient(profile.zentra_api_token, profile.zentra_uuid)
                    result = await zentra.send_message(
                        recipient=recipient,
                        message_type=message.message_type,
                        content=message.content,
                        media_url=message.media_url,
                        caption=message.caption
                    )
                    
                    # Create delivery log
                    delivery_log = DeliveryLog(
                        message_id=message.id,
                        profile_id=profile.id,
                        recipient=recipient,
                        message_mode="open",
                        status="sent" if result["success"] else "failed",
                        zentra_message_id=result.get("data", {}).get("message_id"),
                        response_time_ms=result.get("response_time_ms", 0),
                        error_message=result.get("data", {}).get("error") if not result["success"] else None,
                        sent_at=datetime.now(timezone.utc) if result["success"] else None
                    )
                    self.db.add(delivery_log)
                    
                    # Update message counts
                    message.processed_count += 1
                    if result["success"]:
                        message.success_count += 1
                        # Update conversation routing
                        routing_result = await self.db.execute(
                            select(ConversationRouting).where(
                                ConversationRouting.package_id == package_id,
                                ConversationRouting.customer_phone == recipient
                            )
                        )
                        routing = routing_result.scalar_one_or_none()
                        if not routing:
                            new_routing = ConversationRouting(
                                package_id=package_id,
                                customer_phone=recipient,
                                assigned_profile_id=profile.id,
                                last_interaction_at=datetime.now(timezone.utc)
                            )
                            self.db.add(new_routing)
                        else:
                            routing.assigned_profile_id = profile.id
                            routing.last_interaction_at = datetime.now(timezone.utc)
                    else:
                        message.failed_count += 1
                    
                    # Update profile statistics
                    await self._update_profile_stats(profile.id, result["success"], result.get("response_time_ms", 0))
                    profile.last_message_at = datetime.now(timezone.utc)
                    
                    immediate_sent = True
                    continue

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
            
            # Build limits status (use per-profile limits if set)
            stats = profile.statistics
            sent_hour = stats.messages_sent_hour if stats else 0
            sent_day = stats.messages_sent_today if stats else 0
            p_hourly = profile.max_messages_per_hour if profile.max_messages_per_hour is not None else package.max_messages_per_hour
            p_daily = profile.max_messages_per_day if profile.max_messages_per_day is not None else package.max_messages_per_day
            limits_status[profile_id_str] = {
                "hourly": f"{sent_hour}/{p_hourly}",
                "daily": f"{sent_day}/{p_daily}",
                "status": profile.status
            }
        
        await self.db.flush()
        
        # Estimate completion time
        total_items = sum(len(r) for r in distribution.values())
        avg_cooldown = 600  # 10 min default
        est_seconds = total_items * avg_cooldown / max(len(distribution), 1)
        est_completion = datetime.now(timezone.utc) + timedelta(seconds=est_seconds)
        
        return {
            "message_id": message.id,
            "mode": "open",
            "status": "queued",
            "total_recipients": len(recipients),
            "distribution": {k: len(v) for k, v in distribution.items()},
            "estimated_completion": est_completion.isoformat(),
            "limits_status": limits_status
        }
    
    async def send_reply_chat(self, package_id: UUID, data: dict) -> dict:
        """
        Send Reply Chat message - immediate, no rate limits, sticky routing.
        """
        recipient = data.get("recipient")
        
        # Get package
        pkg_result = await self.db.execute(
            select(Package).where(Package.id == package_id)
        )
        package = pkg_result.scalar_one_or_none()
        if not package:
            raise ValueError("Package not found")
        
        # Find the assigned profile for this recipient (sticky routing)
        routing_result = await self.db.execute(
            select(ConversationRouting).where(
                ConversationRouting.package_id == package_id,
                ConversationRouting.customer_phone == recipient
            )
        )
        routing = routing_result.scalar_one_or_none()
        
        profile = None
        if routing:
            # Use the assigned profile
            prof_result = await self.db.execute(
                select(Profile).where(Profile.id == routing.assigned_profile_id)
            )
            profile = prof_result.scalar_one_or_none()
        
        if not profile:
            # No routing found - use first active profile
            prof_result = await self.db.execute(
                select(Profile).where(
                    Profile.package_id == package_id,
                    Profile.status == "active"
                ).order_by(Profile.weight_score.desc()).limit(1)
            )
            profile = prof_result.scalar_one_or_none()
        
        if not profile:
            raise ValueError("No active profile available for reply")
        
        # Create message record
        message = Message(
            package_id=package_id,
            message_mode="reply",
            message_type=data.get("message_type", "text"),
            content=data.get("content", ""),
            media_url=data.get("media_url"),
            caption=data.get("caption"),
            recipients=[recipient],
            status="processing",
            total_recipients=1
        )
        self.db.add(message)
        await self.db.flush()
        
        # Send immediately via Zentra
        zentra = ZentraClient(profile.zentra_api_token, profile.zentra_uuid)
        result = await zentra.send_message(
            recipient=recipient,
            message_type=message.message_type,
            content=message.content,
            media_url=message.media_url,
            caption=message.caption
        )
        
        # Create delivery log
        delivery_log = DeliveryLog(
            message_id=message.id,
            profile_id=profile.id,
            recipient=recipient,
            message_mode="reply",
            status="sent" if result["success"] else "failed",
            zentra_message_id=result.get("data", {}).get("message_id"),
            response_time_ms=result.get("response_time_ms", 0),
            error_message=result.get("data", {}).get("error") if not result["success"] else None,
            sent_at=datetime.now(timezone.utc) if result["success"] else None
        )
        self.db.add(delivery_log)
        
        # Update message status
        if result["success"]:
            message.status = "completed"
            message.success_count = 1
            message.processed_count = 1
        else:
            message.status = "failed"
            message.failed_count = 1
            message.processed_count = 1
        
        # Update conversation routing
        if routing:
            routing.last_interaction_at = datetime.now(timezone.utc)
            # Ensure the profile is still the same (it should be, but just in case)
            routing.assigned_profile_id = profile.id
        else:
            new_routing = ConversationRouting(
                package_id=package_id,
                customer_phone=recipient,
                assigned_profile_id=profile.id,
                last_interaction_at=datetime.now(timezone.utc)
            )
            self.db.add(new_routing)
        
        # Update profile statistics
        await self._update_profile_stats(profile.id, result["success"], result.get("response_time_ms", 0))
        
        await self.db.flush()
        
        return {
            "message_id": message.id,
            "mode": "reply",
            "status": "sent" if result["success"] else "failed",
            "sent_at": datetime.now(timezone.utc).isoformat() if result["success"] else None,
            "profile_used": profile.name,
            "delivery_time_ms": result.get("response_time_ms", 0),
            "note": "Reply messages bypass all rate limits"
        }
    
    async def get_message(self, message_id: UUID) -> Optional[Message]:
        """Get a message by ID with delivery logs."""
        result = await self.db.execute(
            select(Message)
            .options(selectinload(Message.delivery_logs))
            .where(Message.id == message_id)
        )
        return result.scalar_one_or_none()
    
    async def list_messages(self, package_id: UUID, status: str = None, mode: str = None, limit: int = 50, offset: int = 0) -> List[Message]:
        """List messages with optional filters."""
        query = select(Message).where(Message.package_id == package_id)
        
        if status:
            query = query.where(Message.status == status)
        if mode:
            query = query.where(Message.message_mode == mode)
        
        query = query.order_by(Message.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_delivery_logs(self, message_id: UUID) -> List[DeliveryLog]:
        """Get delivery logs for a message."""
        result = await self.db.execute(
            select(DeliveryLog).where(DeliveryLog.message_id == message_id)
            .order_by(DeliveryLog.created_at.desc())
        )
        return result.scalars().all()
    
    async def process_queue(self):
        """Process pending queue items - called by background scheduler."""
        now = datetime.now(timezone.utc)
        
        # Get items ready to send
        result = await self.db.execute(
            select(MessageQueue)
            .where(
                MessageQueue.status == "waiting",
                MessageQueue.scheduled_send_at <= now
            )
            .order_by(MessageQueue.scheduled_send_at)
            .limit(10)
        )
        items = result.scalars().all()
        
        for item in items:
            await self._process_queue_item(item)
    
    async def _process_queue_item(self, item: MessageQueue):
        """Process a single queue item."""
        item.status = "processing"
        item.attempt_count += 1
        await self.db.flush()
        
        # Get profile
        prof_result = await self.db.execute(
            select(Profile).where(Profile.id == item.profile_id)
        )
        profile = prof_result.scalar_one_or_none()
        
        if not profile or profile.status not in ("active",):
            item.status = "failed"
            item.last_error = "Profile not available"
            await self.db.flush()
            return
        
        # Send via Zentra
        zentra = ZentraClient(profile.zentra_api_token, profile.zentra_uuid)
        result = await zentra.send_message(
            recipient=item.recipient,
            message_type=item.message_type,
            content=item.content,
            media_url=item.media_url,
            caption=item.caption
        )
        
        # Create delivery log
        delivery_log = DeliveryLog(
            message_id=item.message_id,
            profile_id=item.profile_id,
            recipient=item.recipient,
            message_mode="open",
            status="sent" if result["success"] else "failed",
            zentra_message_id=result.get("data", {}).get("message_id"),
            response_time_ms=result.get("response_time_ms", 0),
            error_message=result.get("data", {}).get("error") if not result["success"] else None,
            sent_at=datetime.now(timezone.utc) if result["success"] else None,
            attempt_count=item.attempt_count
        )
        self.db.add(delivery_log)
        
        if result["success"]:
            item.status = "sent"
            item.sent_at = datetime.now(timezone.utc)
            
            # Update conversation routing (sticky routing for future replies)
            msg_result = await self.db.execute(
                select(Message.package_id).where(Message.id == item.message_id)
            )
            pkg_id = msg_result.scalar_one_or_none()
            
            if pkg_id:
                routing_result = await self.db.execute(
                    select(ConversationRouting).where(
                        ConversationRouting.customer_phone == item.recipient,
                        ConversationRouting.package_id == pkg_id
                    )
                )
                routing = routing_result.scalar_one_or_none()
                if not routing:
                    new_routing = ConversationRouting(
                        package_id=pkg_id,
                        customer_phone=item.recipient,
                        assigned_profile_id=item.profile_id,
                        last_interaction_at=datetime.now(timezone.utc)
                    )
                    self.db.add(new_routing)
                else:
                    routing.last_interaction_at = datetime.now(timezone.utc)
                    routing.assigned_profile_id = item.profile_id
        else:
            if item.attempt_count >= item.max_attempts:
                item.status = "failed"
                item.last_error = result.get("data", {}).get("error", "Unknown error")
            else:
                # Retry with exponential backoff
                item.status = "waiting"
                item.scheduled_send_at = datetime.now(timezone.utc) + timedelta(
                    seconds=5 * (2 ** item.attempt_count)
                )
                item.last_error = result.get("data", {}).get("error", "Unknown error")
        
        # Update message counts
        msg_result = await self.db.execute(
            select(Message).where(Message.id == item.message_id)
        )
        message = msg_result.scalar_one_or_none()
        if message:
            message.processed_count += 1
            if result["success"]:
                message.success_count += 1
            else:
                message.failed_count += 1
            
            # Check if all processed
            if message.processed_count >= message.total_recipients:
                message.status = "completed" if message.failed_count == 0 else "completed"
        
        # Update profile stats
        await self._update_profile_stats(item.profile_id, result["success"], result.get("response_time_ms", 0))
        
        # Update profile last_message_at
        profile.last_message_at = datetime.now(timezone.utc)
        
        # Perform block detection check if failure occurred
        if not result["success"]:
            from app.services.block_detection_service import BlockDetectionService
            from app.models.models import Package
            
            pkg_result = await self.db.execute(select(Package).where(Package.id == profile.package_id))
            package = pkg_result.scalar_one_or_none()
            
            if package:
                block_service = BlockDetectionService(self.db)
                await block_service.check_profile_for_blocks(profile, package)
        
        await self.db.flush()
    
    async def _update_profile_stats(self, profile_id: UUID, success: bool, response_time_ms: int):
        """Update profile statistics after sending a message."""
        stats_result = await self.db.execute(
            select(ProfileStatistics).where(ProfileStatistics.profile_id == profile_id)
        )
        stats = stats_result.scalar_one_or_none()
        
        if not stats:
            stats = ProfileStatistics(profile_id=profile_id)
            self.db.add(stats)
            await self.db.flush()
        
        stats.messages_sent_total += 1
        stats.messages_sent_today += 1
        stats.messages_sent_hour += 1
        stats.messages_sent_3hours += 1
        
        if not success:
            stats.failed_messages_today += 1
            stats.failed_messages_hour += 1
        
        # Update success rate
        total_today = stats.messages_sent_today
        failed_today = stats.failed_messages_today
        if total_today > 0:
            stats.success_rate_24h = round(((total_today - failed_today) / total_today) * 100, 2)
        
        # Update average response time
        if response_time_ms > 0:
            if stats.avg_response_time_ms == 0:
                stats.avg_response_time_ms = response_time_ms
            else:
                stats.avg_response_time_ms = (stats.avg_response_time_ms + response_time_ms) / 2
        
        await self.db.flush()
    
    async def get_alerts(self, package_id: UUID = None, unread_only: bool = False) -> List[Alert]:
        """Get alerts, optionally filtered."""
        query = select(Alert)
        if package_id:
            query = query.where(Alert.package_id == package_id)
        if unread_only:
            query = query.where(Alert.is_read == False)
        query = query.order_by(Alert.created_at.desc()).limit(100)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def mark_alert_read(self, alert_id: UUID):
        """Mark an alert as read."""
        await self.db.execute(
            update(Alert).where(Alert.id == alert_id).values(is_read=True)
        )
        await self.db.flush()
    
    async def get_analytics(self, package_id: UUID, days: int = 7) -> dict:
        """Get analytics data for a package with full breakdown."""
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Subquery for messages in this package
        package_messages = select(Message.id).where(Message.package_id == package_id)
        
        # Total messages by status
        status_result = await self.db.execute(
            select(DeliveryLog.status, func.count(DeliveryLog.id))
            .where(
                DeliveryLog.created_at >= since,
                DeliveryLog.message_id.in_(package_messages)
            )
            .group_by(DeliveryLog.status)
        )
        status_counts = {row[0]: row[1] for row in status_result.all()}
        
        # Daily breakdown with sent/delivered/failed per day
        daily_breakdown_result = await self.db.execute(
            select(
                func.date(DeliveryLog.created_at).label("date"),
                func.count(DeliveryLog.id).filter(DeliveryLog.status == "sent").label("sent"),
                func.count(DeliveryLog.id).filter(DeliveryLog.status == "delivered").label("delivered"),
                func.count(DeliveryLog.id).filter(DeliveryLog.status == "failed").label("failed")
            )
            .where(
                DeliveryLog.created_at >= since,
                DeliveryLog.message_id.in_(package_messages)
            )
            .group_by(func.date(DeliveryLog.created_at))
            .order_by(func.date(DeliveryLog.created_at))
        )
        
        # Build daily breakdown with formatted dates
        daily_breakdown = []
        for row in daily_breakdown_result.all():
            date_obj = row[0]
            if hasattr(date_obj, 'strftime'):
                formatted_date = date_obj.strftime("%b %d")
            else:
                formatted_date = str(date_obj)
            daily_breakdown.append({
                "date": formatted_date,
                "sent": row[1] or 0,
                "delivered": row[2] or 0,
                "failed": row[3] or 0
            })
        
        # Hourly breakdown - messages per hour of day
        hourly_result = await self.db.execute(
            select(
                func.extract('hour', DeliveryLog.created_at).label("hour"),
                func.count(DeliveryLog.id).label("messages")
            )
            .where(
                DeliveryLog.created_at >= since,
                DeliveryLog.message_id.in_(package_messages)
            )
            .group_by(func.extract('hour', DeliveryLog.created_at))
            .order_by(func.extract('hour', DeliveryLog.created_at))
        )
        
        # Build hourly breakdown with all 24 hours
        hourly_map = {int(row[0]): row[1] for row in hourly_result.all()}
        hourly_breakdown = [
            {"hour": f"{h}:00", "messages": hourly_map.get(h, 0)}
            for h in range(24)
        ]
        
        # Average delivery time from response_time_ms
        avg_time_result = await self.db.execute(
            select(func.avg(DeliveryLog.response_time_ms))
            .where(
                DeliveryLog.created_at >= since,
                DeliveryLog.message_id.in_(package_messages),
                DeliveryLog.response_time_ms > 0
            )
        )
        avg_delivery_ms = avg_time_result.scalar() or 0
        avg_delivery_time = round(avg_delivery_ms / 1000, 1) if avg_delivery_ms else 0
        
        # Per profile stats
        profile_result = await self.db.execute(
            select(
                Profile.name,
                func.count(DeliveryLog.id).label("total"),
                func.count(DeliveryLog.id).filter(DeliveryLog.status == "sent").label("sent"),
                func.count(DeliveryLog.id).filter(DeliveryLog.status == "failed").label("failed")
            )
            .join(DeliveryLog, DeliveryLog.profile_id == Profile.id)
            .where(
                Profile.package_id == package_id,
                DeliveryLog.created_at >= since
            )
            .group_by(Profile.name)
        )
        profile_stats = [
            {"name": row[0], "total": row[1], "sent": row[2], "failed": row[3]}
            for row in profile_result.all()
        ]
        
        # Count queued messages
        queued_result = await self.db.execute(
            select(func.count(Message.id))
            .where(
                Message.package_id == package_id,
                Message.status == "queued"
            )
        )
        queued_count = queued_result.scalar() or 0
        
        total = sum(status_counts.values())
        sent = status_counts.get("sent", 0)
        delivered = status_counts.get("delivered", 0)
        failed = status_counts.get("failed", 0)
        
        return {
            "period_days": days,
            # Summary stats for frontend cards
            "total_sent": sent + delivered,
            "sent": sent,
            "delivered": delivered,
            "failed": failed,
            "queued": queued_count,
            "avg_delivery_time": avg_delivery_time,
            # Chart data
            "daily_breakdown": daily_breakdown,
            "hourly_breakdown": hourly_breakdown,
            # Legacy fields
            "status_counts": status_counts,
            "profile_stats": profile_stats,
            "total_messages": total,
            "success_rate": round(sent / max(total, 1) * 100, 2)
        }
    
    async def delete_all_messages(self, package_id: UUID) -> int:
        """Delete all messages for a package along with related data."""
        from sqlalchemy import delete as sql_delete
        
        # Get message IDs for this package (for deleting related data)
        msg_ids_result = await self.db.execute(
            select(Message.id).where(Message.package_id == package_id)
        )
        message_ids = [row[0] for row in msg_ids_result.all()]
        
        if not message_ids:
            return 0
        
        # Delete delivery logs for these messages
        await self.db.execute(
            sql_delete(DeliveryLog).where(DeliveryLog.message_id.in_(message_ids))
        )
        
        # Delete queue items for these messages
        await self.db.execute(
            sql_delete(MessageQueue).where(MessageQueue.message_id.in_(message_ids))
        )
        
        # Delete the messages themselves
        result = await self.db.execute(
            sql_delete(Message).where(Message.package_id == package_id)
        )
        
        await self.db.flush()
        return result.rowcount
    
    async def delete_all_queue_items(self, package_id: UUID) -> int:
        """Delete all queue items for a package (orphaned or waiting)."""
        from sqlalchemy import delete as sql_delete
        
        # Get profile IDs for this package
        profile_ids_result = await self.db.execute(
            select(Profile.id).where(Profile.package_id == package_id)
        )
        profile_ids = [row[0] for row in profile_ids_result.all()]
        
        if not profile_ids:
            return 0
        
        # Delete queue items for these profiles
        result = await self.db.execute(
            sql_delete(MessageQueue).where(MessageQueue.profile_id.in_(profile_ids))
        )
        
        await self.db.flush()
        return result.rowcount

