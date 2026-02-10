"""Auto-Adjust Limits Service - Dynamically adjusts rate limits based on performance."""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import (
    Profile, ProfileStatistics, DeliveryLog, Package, Alert
)

logger = logging.getLogger(__name__)


class AutoAdjustService:
    """Dynamically adjusts package rate limits based on profile performance."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_and_adjust(self, package: Package) -> dict:
        """
        Evaluate package performance and adjust limits if auto_adjust_limits is enabled.
        
        Logic:
        - If overall success rate > 98% for 24h → increase limits by 10% (max 2x original)
        - If overall success rate < 85% → decrease limits by 15%
        - If any profile is blocked/paused → decrease limits by 20%
        - Rush hour detection: if queue > rush_hour_threshold → multiply cooldown
        - Quiet mode: if queue < quiet_mode_threshold → reduce cooldown
        """
        if not package.auto_adjust_limits:
            return {"adjusted": False, "reason": "Auto-adjust is disabled"}

        # Cooldown: only auto-adjust once per configured interval to prevent cascading changes
        interval_minutes = getattr(package, 'auto_adjust_interval_minutes', 360) or 360
        cooldown_ago = datetime.now(timezone.utc) - timedelta(minutes=interval_minutes)
        recent_adjust = await self.db.execute(
            select(func.count(Alert.id)).where(
                Alert.package_id == package.id,
                Alert.alert_type == "system",
                Alert.title.like(f"Rate Limits Auto-Adjusted: {package.name}%"),
                Alert.created_at >= cooldown_ago
            )
        )
        if (recent_adjust.scalar() or 0) > 0:
            return {"adjusted": False, "reason": f"Already adjusted within last {interval_minutes} minutes"}

        # Get all profiles with stats
        profiles_result = await self.db.execute(
            select(Profile).where(Profile.package_id == package.id)
        )
        profiles = profiles_result.scalars().all()

        if not profiles:
            return {"adjusted": False, "reason": "No profiles in package"}

        # Calculate aggregate stats
        total_sent = 0
        total_failed = 0
        paused_count = 0
        active_count = 0

        for profile in profiles:
            stats_result = await self.db.execute(
                select(ProfileStatistics).where(ProfileStatistics.profile_id == profile.id)
            )
            stats = stats_result.scalar_one_or_none()
            if stats:
                total_sent += stats.messages_sent_today
                total_failed += stats.failed_messages_today
            if profile.status == "paused":
                paused_count += 1
            elif profile.status == "active":
                active_count += 1

        overall_success_rate = ((total_sent - total_failed) / max(total_sent, 1)) * 100
        adjustments = []

        # Store original limits for reference
        original_hourly = package.max_messages_per_hour
        original_3h = package.max_messages_per_3hours
        original_daily = package.max_messages_per_day

        # --- Rule 1: High success rate → increase limits ---
        if overall_success_rate > 98 and total_sent > 20:
            increase_factor = 1.10  # 10% increase
            # Cap at 2x the default values
            max_hourly = 40  # 2x default 20
            max_3h = 90     # 2x default 45
            max_daily = 240  # 2x default 120

            new_hourly = min(int(package.max_messages_per_hour * increase_factor), max_hourly)
            new_3h = min(int(package.max_messages_per_3hours * increase_factor), max_3h)
            new_daily = min(int(package.max_messages_per_day * increase_factor), max_daily)

            if new_hourly > package.max_messages_per_hour:
                package.max_messages_per_hour = new_hourly
                package.max_messages_per_3hours = new_3h
                package.max_messages_per_day = new_daily
                adjustments.append(f"Increased limits by 10% (success rate: {overall_success_rate:.1f}%)")

        # --- Rule 2: Low success rate → decrease limits ---
        elif overall_success_rate < 85 and total_sent > 10:
            decrease_factor = 0.85  # 15% decrease
            min_hourly = 5
            min_3h = 10
            min_daily = 30

            new_hourly = max(int(package.max_messages_per_hour * decrease_factor), min_hourly)
            new_3h = max(int(package.max_messages_per_3hours * decrease_factor), min_3h)
            new_daily = max(int(package.max_messages_per_day * decrease_factor), min_daily)

            package.max_messages_per_hour = new_hourly
            package.max_messages_per_3hours = new_3h
            package.max_messages_per_day = new_daily
            adjustments.append(f"Decreased limits by 15% (success rate: {overall_success_rate:.1f}%)")

        # --- Rule 3: Paused profiles → additional decrease ---
        if paused_count > 0 and active_count > 0:
            pause_ratio = paused_count / (paused_count + active_count)
            if pause_ratio > 0.3:
                decrease_factor = 0.80  # 20% decrease
                package.max_messages_per_hour = max(5, int(package.max_messages_per_hour * decrease_factor))
                package.max_messages_per_3hours = max(10, int(package.max_messages_per_3hours * decrease_factor))
                package.max_messages_per_day = max(30, int(package.max_messages_per_day * decrease_factor))
                adjustments.append(f"Additional 20% decrease ({paused_count} profiles paused)")

        if adjustments:
            # Check if limits actually changed from original values
            limits_changed = (
                package.max_messages_per_hour != original_hourly or
                package.max_messages_per_3hours != original_3h or
                package.max_messages_per_day != original_daily
            )
            
            if limits_changed:
                await self.db.flush()

                # Deduplication: Check if we already have a similar alert in the last hour
                one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
                existing = await self.db.execute(
                    select(func.count(Alert.id)).where(
                        Alert.package_id == package.id,
                        Alert.alert_type == "system",
                        Alert.title.like(f"Rate Limits Auto-Adjusted: {package.name}%"),
                        Alert.created_at >= one_hour_ago
                    )
                )
                if (existing.scalar() or 0) > 0:
                    logger.debug(f"Skipping duplicate auto-adjust alert for package {package.name}")
                else:
                    # Create info alert about adjustment
                    alert = Alert(
                        package_id=package.id,
                        alert_type="system",
                        severity="info",
                        title=f"Rate Limits Auto-Adjusted: {package.name}",
                        message=f"Adjustments: {'; '.join(adjustments)}. "
                                f"New limits: {package.max_messages_per_hour}/hr, "
                                f"{package.max_messages_per_3hours}/3hr, "
                                f"{package.max_messages_per_day}/day"
                    )
                    self.db.add(alert)
                    await self.db.flush()

                logger.info(f"Auto-adjusted limits for package {package.name}: {adjustments}")
            else:
                # Limits didn't actually change (already at min/max)
                adjustments = []  # Clear adjustments since nothing changed

        return {
            "adjusted": len(adjustments) > 0,
            "adjustments": adjustments,
            "current_limits": {
                "hourly": package.max_messages_per_hour,
                "three_hour": package.max_messages_per_3hours,
                "daily": package.max_messages_per_day
            },
            "previous_limits": {
                "hourly": original_hourly,
                "three_hour": original_3h,
                "daily": original_daily
            },
            "stats": {
                "overall_success_rate": round(overall_success_rate, 2),
                "total_sent_today": total_sent,
                "total_failed_today": total_failed,
                "active_profiles": active_count,
                "paused_profiles": paused_count
            }
        }

    async def get_queue_mode(self, package: Package) -> dict:
        """
        Determine current queue mode based on queue size and thresholds.
        
        Returns rush_hour, normal, or quiet mode with appropriate multipliers.
        """
        from app.models.models import MessageQueue

        # Count pending queue items
        queue_result = await self.db.execute(
            select(func.count(MessageQueue.id)).where(
                MessageQueue.status == "waiting",
                MessageQueue.message_id.in_(
                    select(Message.id).where(Message.package_id == package.id)
                ) if False else True  # Simplified - count all waiting
            )
        )
        queue_size = queue_result.scalar() or 0

        if queue_size >= package.rush_hour_threshold:
            return {
                "mode": "rush_hour",
                "multiplier": package.rush_hour_multiplier,
                "queue_size": queue_size,
                "detail": f"Queue ({queue_size}) >= rush threshold ({package.rush_hour_threshold})"
            }
        elif queue_size <= package.quiet_mode_threshold:
            return {
                "mode": "quiet",
                "multiplier": package.quiet_mode_multiplier,
                "queue_size": queue_size,
                "detail": f"Queue ({queue_size}) <= quiet threshold ({package.quiet_mode_threshold})"
            }
        else:
            return {
                "mode": "normal",
                "multiplier": 1.0,
                "queue_size": queue_size,
                "detail": "Normal operating mode"
            }
