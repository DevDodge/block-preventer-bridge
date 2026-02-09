"""Block Detection Service - Detects block indicators and auto-pauses profiles."""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.models import (
    Profile, ProfileStatistics, DeliveryLog, Alert, Package, MessageQueue
)

logger = logging.getLogger(__name__)


class BlockDetectionService:
    """Detects block indicators and manages auto-pause logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_profile_for_blocks(self, profile: Profile, package: Package) -> dict:
        """
        Analyze a profile for block indicators and take action if needed.

        Block indicators:
        1. Consecutive failures >= threshold
        2. Success rate drops below threshold
        3. Zentra API returns specific block-related errors
        4. Sudden spike in response times (>10x average)
        5. All recent messages failed in last 30 minutes
        """
        stats_result = await self.db.execute(
            select(ProfileStatistics).where(ProfileStatistics.profile_id == profile.id)
        )
        stats = stats_result.scalar_one_or_none()
        if not stats:
            return {"blocked": False, "indicators": [], "action": "none"}

        indicators = []
        severity = "low"

        # --- Indicator 1: Consecutive failures ---
        recent_logs = await self._get_recent_logs(profile.id, limit=10)
        consecutive_failures = 0
        for log in recent_logs:
            if log.status == "failed":
                consecutive_failures += 1
            else:
                break

        if consecutive_failures >= package.auto_pause_failure_threshold:
            indicators.append({
                "type": "consecutive_failures",
                "detail": f"{consecutive_failures} consecutive failures (threshold: {package.auto_pause_failure_threshold})",
                "severity": "critical"
            })
            severity = "critical"
        elif consecutive_failures >= 3:
            indicators.append({
                "type": "consecutive_failures",
                "detail": f"{consecutive_failures} consecutive failures",
                "severity": "warning"
            })
            if severity != "critical":
                severity = "warning"

        # --- Indicator 2: Low success rate ---
        if stats.success_rate_24h < package.auto_pause_success_rate_threshold:
            indicators.append({
                "type": "low_success_rate",
                "detail": f"Success rate {stats.success_rate_24h}% (threshold: {package.auto_pause_success_rate_threshold}%)",
                "severity": "critical"
            })
            severity = "critical"
        elif stats.success_rate_24h < 80:
            indicators.append({
                "type": "low_success_rate",
                "detail": f"Success rate {stats.success_rate_24h}%",
                "severity": "warning"
            })

        # --- Indicator 3: Block-related error messages ---
        block_keywords = ["blocked", "banned", "suspended", "deactivated", "not registered",
                          "rate limit", "too many", "spam", "temporarily unavailable"]
        block_errors = await self._check_error_patterns(profile.id, block_keywords)
        if block_errors:
            indicators.append({
                "type": "block_error_detected",
                "detail": f"Block-related errors found: {', '.join(block_errors[:3])}",
                "severity": "critical"
            })
            severity = "critical"

        # --- Indicator 4: Response time spike ---
        avg_response = stats.avg_response_time_ms
        if avg_response > 0:
            recent_avg = await self._get_recent_avg_response(profile.id, minutes=30)
            if recent_avg > avg_response * 10 and recent_avg > 5000:
                indicators.append({
                    "type": "response_time_spike",
                    "detail": f"Recent avg {int(recent_avg)}ms vs overall {int(avg_response)}ms ({int(recent_avg/max(avg_response,1))}x increase)",
                    "severity": "warning"
                })

        # --- Indicator 5: All recent messages failed ---
        thirty_min_ago = datetime.now(timezone.utc) - timedelta(minutes=30)
        recent_result = await self.db.execute(
            select(func.count(DeliveryLog.id)).where(
                DeliveryLog.profile_id == profile.id,
                DeliveryLog.created_at >= thirty_min_ago
            )
        )
        recent_total = recent_result.scalar() or 0

        recent_failed_result = await self.db.execute(
            select(func.count(DeliveryLog.id)).where(
                DeliveryLog.profile_id == profile.id,
                DeliveryLog.created_at >= thirty_min_ago,
                DeliveryLog.status == "failed"
            )
        )
        recent_failed = recent_failed_result.scalar() or 0

        if recent_total >= 5 and recent_failed == recent_total:
            indicators.append({
                "type": "all_recent_failed",
                "detail": f"All {recent_total} messages in last 30 min failed",
                "severity": "critical"
            })
            severity = "critical"

        # --- Determine action ---
        action = "none"
        is_blocked = False

        if severity == "critical" and package.auto_pause_on_failures:
            action = "auto_pause"
            is_blocked = True
            await self._auto_pause_profile(profile, indicators, package)
        elif severity == "warning":
            action = "alert_only"
            await self._create_block_warning(profile, indicators, package)

        return {
            "blocked": is_blocked,
            "indicators": indicators,
            "action": action,
            "severity": severity,
            "consecutive_failures": consecutive_failures
        }

    async def check_all_profiles(self, package_id: UUID) -> list:
        """Check all active profiles in a package for block indicators."""
        pkg_result = await self.db.execute(
            select(Package).where(Package.id == package_id)
        )
        package = pkg_result.scalar_one_or_none()
        if not package:
            return []

        profiles_result = await self.db.execute(
            select(Profile).where(
                Profile.package_id == package_id,
                Profile.status == "active"
            )
        )
        profiles = profiles_result.scalars().all()

        results = []
        for profile in profiles:
            result = await self.check_profile_for_blocks(profile, package)
            results.append({
                "profile_id": str(profile.id),
                "profile_name": profile.name,
                **result
            })

        return results

    async def _auto_pause_profile(self, profile: Profile, indicators: list, package: Package):
        """Auto-pause a profile and create an alert."""
        profile.status = "paused"
        profile.pause_reason = f"Auto-paused: {indicators[0]['detail']}"
        profile.last_block_at = datetime.now(timezone.utc)
        # Resume after 2 hours by default
        profile.resume_at = datetime.now(timezone.utc) + timedelta(hours=2)
        await self.db.flush()

        # Cancel pending queue items for this profile
        await self.db.execute(
            update(MessageQueue).where(
                MessageQueue.profile_id == profile.id,
                MessageQueue.status == "waiting"
            ).values(status="cancelled", last_error="Profile auto-paused due to block detection")
        )

        # Create critical alert
        alert = Alert(
            package_id=profile.package_id,
            profile_id=profile.id,
            alert_type="block_detected",
            severity="critical",
            title=f"Profile Auto-Paused: {profile.name}",
            message=f"Block indicators detected. {'; '.join(i['detail'] for i in indicators[:3])}. "
                    f"Profile paused and will resume at {profile.resume_at.strftime('%H:%M UTC')}."
        )
        self.db.add(alert)
        await self.db.flush()

        logger.warning(f"Profile {profile.name} ({profile.id}) auto-paused due to block detection")

    async def _create_block_warning(self, profile: Profile, indicators: list, package: Package):
        """Create a warning alert without pausing."""
        # Check if we already have a recent warning for this profile
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        existing = await self.db.execute(
            select(func.count(Alert.id)).where(
                Alert.profile_id == profile.id,
                Alert.alert_type == "block_warning",
                Alert.created_at >= one_hour_ago
            )
        )
        if (existing.scalar() or 0) > 0:
            return  # Don't spam warnings

        alert = Alert(
            package_id=profile.package_id,
            profile_id=profile.id,
            alert_type="block_warning",
            severity="warning",
            title=f"Block Risk Warning: {profile.name}",
            message=f"Potential block indicators: {'; '.join(i['detail'] for i in indicators[:3])}. "
                    f"Monitor closely."
        )
        self.db.add(alert)
        await self.db.flush()

    async def _get_recent_logs(self, profile_id: UUID, limit: int = 10) -> list:
        """Get the most recent delivery logs for a profile."""
        result = await self.db.execute(
            select(DeliveryLog).where(
                DeliveryLog.profile_id == profile_id
            ).order_by(DeliveryLog.created_at.desc()).limit(limit)
        )
        return result.scalars().all()

    async def _check_error_patterns(self, profile_id: UUID, keywords: list) -> list:
        """Check recent errors for block-related keywords."""
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        result = await self.db.execute(
            select(DeliveryLog.error_message).where(
                DeliveryLog.profile_id == profile_id,
                DeliveryLog.status == "failed",
                DeliveryLog.error_message.isnot(None),
                DeliveryLog.created_at >= one_hour_ago
            ).limit(20)
        )
        errors = result.scalars().all()

        matched = []
        for error in errors:
            if error:
                for keyword in keywords:
                    if keyword.lower() in error.lower():
                        matched.append(keyword)
                        break
        return list(set(matched))

    async def _get_recent_avg_response(self, profile_id: UUID, minutes: int = 30) -> float:
        """Get average response time for recent messages."""
        since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        result = await self.db.execute(
            select(func.avg(DeliveryLog.response_time_ms)).where(
                DeliveryLog.profile_id == profile_id,
                DeliveryLog.response_time_ms.isnot(None),
                DeliveryLog.response_time_ms > 0,
                DeliveryLog.created_at >= since
            )
        )
        return result.scalar() or 0.0

    async def auto_resume_profiles(self):
        """Auto-resume profiles whose resume_at time has passed."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Profile).where(
                Profile.status == "paused",
                Profile.resume_at.isnot(None),
                Profile.resume_at <= now
            )
        )
        profiles = result.scalars().all()

        for profile in profiles:
            profile.status = "active"
            profile.pause_reason = None
            profile.resume_at = None

            alert = Alert(
                package_id=profile.package_id,
                profile_id=profile.id,
                alert_type="profile_resumed",
                severity="info",
                title=f"Profile Auto-Resumed: {profile.name}",
                message=f"Profile {profile.name} has been automatically resumed after the cooldown period."
            )
            self.db.add(alert)
            logger.info(f"Profile {profile.name} ({profile.id}) auto-resumed")

        if profiles:
            await self.db.flush()

        return len(profiles)
