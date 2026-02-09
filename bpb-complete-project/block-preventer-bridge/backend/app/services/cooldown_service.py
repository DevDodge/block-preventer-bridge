"""Cooldown Calculator Service - Smart adaptive cooldown between messages."""
import random
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import (
    Package, Profile, ProfileStatistics, MessageQueue, DeliveryLog
)

logger = logging.getLogger(__name__)


class CooldownService:
    """Calculates smart cooldown times between messages."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def calculate_cooldown(self, package: Package, profile: Profile) -> dict:
        """
        Calculate the cooldown for the next message from this profile.
        
        Returns dict with:
        - cooldown_seconds: actual cooldown to apply
        - cooldown_mode: quiet/normal/rush_hour/critical
        - breakdown: detailed calculation steps
        """
        # Get profile statistics
        stats_result = await self.db.execute(
            select(ProfileStatistics).where(ProfileStatistics.profile_id == profile.id)
        )
        stats = stats_result.scalar_one_or_none()
        
        # STEP 1: Calculate Base Cooldown
        # active_minutes_per_day = 20 hours * 60 = 1200 minutes
        active_minutes = (24 - package.freeze_duration_hours) * 60
        base_cooldown_minutes = active_minutes / max(package.max_messages_per_day, 1)
        base_cooldown_seconds = base_cooldown_minutes * 60
        
        # STEP 2: Apply Random Range (0.5x to 1.5x)
        min_cooldown = base_cooldown_seconds * 0.5
        max_cooldown = base_cooldown_seconds * 1.5
        random_cooldown = random.uniform(min_cooldown, max_cooldown)
        
        # STEP 3: Get queue size and apply Queue Pressure Multiplier
        queue_result = await self.db.execute(
            select(func.count(MessageQueue.id)).where(
                MessageQueue.profile_id == profile.id,
                MessageQueue.status == "waiting"
            )
        )
        queue_size = queue_result.scalar() or 0
        
        # Also get total package queue
        pkg_queue_result = await self.db.execute(
            select(func.count(MessageQueue.id)).where(
                MessageQueue.status == "waiting",
                MessageQueue.profile_id.in_(
                    select(Profile.id).where(Profile.package_id == package.id)
                )
            )
        )
        total_queue_size = pkg_queue_result.scalar() or 0
        
        # Determine queue mode
        if total_queue_size >= 21:
            queue_mode = "critical"
            queue_multiplier = 3.0
        elif total_queue_size > package.rush_hour_threshold:
            queue_mode = "rush_hour"
            queue_multiplier = package.rush_hour_multiplier
        elif total_queue_size <= package.quiet_mode_threshold:
            queue_mode = "quiet"
            queue_multiplier = package.quiet_mode_multiplier
        else:
            queue_mode = "normal"
            queue_multiplier = 1.0
        
        adjusted_cooldown = random_cooldown * queue_multiplier
        
        # STEP 4: Apply 2-Hour Trend Adjustment
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
        trend_result = await self.db.execute(
            select(func.count(DeliveryLog.id)).where(
                DeliveryLog.profile_id == profile.id,
                DeliveryLog.created_at >= two_hours_ago,
                DeliveryLog.status.in_(["sent", "delivered"])
            )
        )
        actual_2h = trend_result.scalar() or 0
        expected_2h = (package.max_messages_per_hour * 2) * 0.8
        
        trend_adjustment = 1.0
        trend_description = "on target"
        if expected_2h > 0:
            trend_ratio = actual_2h / expected_2h
            if trend_ratio > 1.0:
                # Sending too fast - add 30% more cooldown
                trend_adjustment = 1.3
                trend_description = f"sending too fast ({actual_2h}/{int(expected_2h)} = {int(trend_ratio*100)}%)"
            elif trend_ratio < 0.5:
                # Sending too slow - reduce 20% cooldown
                trend_adjustment = 0.8
                trend_description = f"sending too slow ({actual_2h}/{int(expected_2h)} = {int(trend_ratio*100)}%)"
        
        final_cooldown = adjusted_cooldown * trend_adjustment
        
        # Apply risk score adjustment
        if profile.risk_score > 80:
            final_cooldown *= 2.0
        elif profile.risk_score > 50:
            final_cooldown *= 1.5
        elif profile.risk_score > 20:
            final_cooldown *= 1.2
        
        # Ensure minimum 60 seconds, maximum 40 minutes
        final_cooldown = max(60, min(final_cooldown, 2400))
        final_cooldown_seconds = int(final_cooldown)
        
        # Calculate cooldown ranges for display
        mode_ranges = {
            "quiet": {"min": 180, "max": 480},
            "normal": {"min": 300, "max": 900},
            "rush_hour": {"min": 600, "max": 1500},
            "critical": {"min": 1200, "max": 2400}
        }
        
        breakdown = {
            "base_cooldown_seconds": int(base_cooldown_seconds),
            "base_cooldown_minutes": round(base_cooldown_minutes, 1),
            "random_range": {"min": int(min_cooldown), "max": int(max_cooldown)},
            "random_selected": int(random_cooldown),
            "queue_size": total_queue_size,
            "queue_mode": queue_mode,
            "queue_multiplier": queue_multiplier,
            "after_queue_adjustment": int(adjusted_cooldown),
            "two_hour_actual": actual_2h,
            "two_hour_expected": int(expected_2h),
            "trend_adjustment": trend_adjustment,
            "trend_description": trend_description,
            "risk_score": profile.risk_score,
            "final_cooldown_seconds": final_cooldown_seconds,
            "final_cooldown_minutes": round(final_cooldown_seconds / 60, 1),
            "mode_ranges": mode_ranges.get(queue_mode, mode_ranges["normal"])
        }
        
        # Update profile statistics
        if stats:
            stats.current_cooldown_seconds = final_cooldown_seconds
            stats.cooldown_expires_at = datetime.now(timezone.utc) + timedelta(seconds=final_cooldown_seconds)
            stats.cooldown_mode = queue_mode
            await self.db.flush()
        
        return {
            "cooldown_seconds": final_cooldown_seconds,
            "cooldown_mode": queue_mode,
            "breakdown": breakdown
        }
    
    async def get_queue_status(self, package_id) -> dict:
        """Get the current queue status for a package."""
        # Count waiting messages
        waiting_result = await self.db.execute(
            select(func.count(MessageQueue.id)).where(
                MessageQueue.status == "waiting",
                MessageQueue.profile_id.in_(
                    select(Profile.id).where(Profile.package_id == package_id)
                )
            )
        )
        waiting = waiting_result.scalar() or 0
        
        processing_result = await self.db.execute(
            select(func.count(MessageQueue.id)).where(
                MessageQueue.status == "processing",
                MessageQueue.profile_id.in_(
                    select(Profile.id).where(Profile.package_id == package_id)
                )
            )
        )
        processing = processing_result.scalar() or 0
        
        # Determine mode
        if waiting >= 21:
            mode = "critical"
        elif waiting > 10:
            mode = "rush_hour"
        elif waiting <= 5:
            mode = "quiet"
        else:
            mode = "normal"
        
        return {
            "total_waiting": waiting,
            "total_processing": processing,
            "queue_mode": mode
        }
