"""
Global Queue Service - Package-level queue coordination.

This service ensures that messages are properly spaced across ALL profiles in a package,
regardless of whether recipients arrive in a single multi-recipient request or multiple
single-recipient requests.

The key insight: when we have 3 profiles and 9 recipients, the timeline should look like:

    Time 0:00  -> Profile A sends to recipient 1
    Time 0:30  -> Profile B sends to recipient 2
    Time 1:00  -> Profile C sends to recipient 3
    Time 2:00  -> Profile A sends to recipient 4  (cooldown for Profile A)
    Time 2:30  -> Profile B sends to recipient 5  (cooldown for Profile B)
    Time 3:00  -> Profile C sends to recipient 6  (cooldown for Profile C)
    ...

This timeline must be IDENTICAL whether:
- 1 request with 9 recipients
- 9 requests with 1 recipient each
- 3 requests with 3 recipients each
"""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID
from typing import Dict, List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.models import (
    MessageQueue, Profile, ProfileStatistics, Package, Message
)
from app.services.cooldown_service import CooldownService

logger = logging.getLogger(__name__)


class GlobalQueueService:
    """
    Coordinates message scheduling across all profiles in a package.
    
    Instead of each profile maintaining its own independent timeline,
    this service maintains a single global timeline for the entire package.
    Messages are interleaved across profiles with proper cooldown spacing.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_global_next_slot(
        self,
        package: Package,
        profile_id: UUID,
        cooldown_seconds: int
    ) -> datetime:
        """
        Get the next available time slot for a profile, considering the GLOBAL queue state.
        
        This method looks at ALL waiting queue items across ALL profiles in the package
        to determine when the next message should be scheduled.
        
        For a given profile, the next slot is the LATER of:
        1. The last scheduled time for THIS profile + cooldown_seconds
        2. The global last scheduled time + inter_profile_gap
        
        The inter_profile_gap is: cooldown_seconds / num_active_profiles
        This ensures messages are evenly distributed across the timeline.
        """
        now = datetime.now(timezone.utc)
        
        # Get all active profiles in this package
        active_profiles_result = await self.db.execute(
            select(Profile.id).where(
                Profile.package_id == package.id,
                Profile.status == "active"
            )
        )
        active_profile_ids = [row[0] for row in active_profiles_result.all()]
        num_profiles = max(len(active_profile_ids), 1)
        
        # Calculate inter-profile gap: the time between consecutive messages
        # across different profiles. If cooldown is 120s and we have 3 profiles,
        # each profile needs 120s between its own messages, but messages from
        # different profiles can be interleaved every 40s (120/3).
        inter_profile_gap = cooldown_seconds / num_profiles
        
        # 1. Find the last scheduled time for THIS specific profile
        last_for_profile_result = await self.db.execute(
            select(func.max(MessageQueue.scheduled_send_at)).where(
                MessageQueue.profile_id == profile_id,
                MessageQueue.status == "waiting"
            )
        )
        last_for_profile = last_for_profile_result.scalar()
        
        # Also consider the profile's last_message_at (when it actually last sent)
        profile_result = await self.db.execute(
            select(Profile).where(Profile.id == profile_id)
        )
        profile = profile_result.scalar_one_or_none()
        
        # The earliest this profile can send based on its own cooldown
        profile_earliest = now
        if last_for_profile and last_for_profile > now:
            profile_earliest = last_for_profile + timedelta(seconds=cooldown_seconds)
        elif profile and profile.last_message_at:
            after_last_sent = profile.last_message_at + timedelta(seconds=cooldown_seconds)
            if after_last_sent > profile_earliest:
                profile_earliest = after_last_sent
        
        # 2. Find the GLOBAL last scheduled time across ALL profiles in this package
        global_last_result = await self.db.execute(
            select(func.max(MessageQueue.scheduled_send_at)).where(
                MessageQueue.profile_id.in_(active_profile_ids),
                MessageQueue.status == "waiting"
            )
        )
        global_last = global_last_result.scalar()
        
        # The earliest based on global queue (inter-profile gap after last global item)
        global_earliest = now
        if global_last and global_last > now:
            global_earliest = global_last + timedelta(seconds=inter_profile_gap)
        
        # The actual send time is the LATER of profile-specific and global constraints
        send_at = max(profile_earliest, global_earliest)
        
        # Ensure we never schedule in the past
        if send_at < now:
            send_at = now
        
        logger.info(
            f"Global queue slot: profile={profile_id}, "
            f"cooldown={cooldown_seconds}s, inter_gap={inter_profile_gap:.0f}s, "
            f"profile_earliest={profile_earliest.isoformat()}, "
            f"global_earliest={global_earliest.isoformat()}, "
            f"final_send_at={send_at.isoformat()}"
        )
        
        return send_at
    
    async def schedule_recipients(
        self,
        package: Package,
        message: Message,
        distribution: Dict[str, List[str]],
        cooldown_per_profile: Dict[str, int]
    ) -> List[MessageQueue]:
        """
        Schedule all recipients across all profiles using the global queue.
        
        This creates a unified timeline where messages are interleaved across profiles.
        
        Args:
            package: The package
            message: The message record
            distribution: {profile_id_str: [recipient1, recipient2, ...]}
            cooldown_per_profile: {profile_id_str: cooldown_seconds}
        
        Returns:
            List of created MessageQueue items
        """
        queue_items = []
        
        # Build a flat list of (profile_id, recipient) pairs in interleaved order
        # This ensures round-robin across profiles: A1, B1, C1, A2, B2, C2, ...
        interleaved = self._interleave_recipients(distribution)
        
        for profile_id_str, recipient in interleaved:
            profile_id = UUID(profile_id_str)
            cooldown = cooldown_per_profile.get(profile_id_str, 600)
            
            # Get the next available slot from the global queue
            send_at = await self.get_global_next_slot(package, profile_id, cooldown)
            
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
            # Flush immediately so the next call to get_global_next_slot sees this item
            await self.db.flush()
            
            queue_items.append(queue_item)
            
            logger.info(
                f"Queued: recipient={recipient}, profile={profile_id_str}, "
                f"send_at={send_at.isoformat()}"
            )
        
        return queue_items
    
    def _interleave_recipients(
        self, distribution: Dict[str, List[str]]
    ) -> List[Tuple[str, str]]:
        """
        Interleave recipients across profiles in round-robin order.
        
        Input:  {"A": [r1, r4, r7], "B": [r2, r5, r8], "C": [r3, r6, r9]}
        Output: [(A, r1), (B, r2), (C, r3), (A, r4), (B, r5), (C, r6), (A, r7), (B, r8), (C, r9)]
        
        This ensures even distribution across the timeline.
        """
        result = []
        profile_ids = list(distribution.keys())
        
        if not profile_ids:
            return result
        
        # Find the max number of recipients any profile has
        max_recipients = max(len(recipients) for recipients in distribution.values())
        
        for i in range(max_recipients):
            for profile_id in profile_ids:
                recipients = distribution[profile_id]
                if i < len(recipients):
                    result.append((profile_id, recipients[i]))
        
        return result
