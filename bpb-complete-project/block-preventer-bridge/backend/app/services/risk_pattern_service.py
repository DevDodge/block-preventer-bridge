"""Risk Pattern Detection Service - Identifies high-risk messaging patterns."""
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import (
    Profile, ProfileStatistics, DeliveryLog, Message, Alert, Package
)

logger = logging.getLogger(__name__)


class RiskPatternService:
    """Detects risky messaging patterns that could trigger WhatsApp blocks."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_patterns(self, profile: Profile, package: Package) -> dict:
        """
        Comprehensive risk pattern analysis for a profile.
        
        Patterns checked:
        1. Duplicate content detection (same message to many recipients)
        2. Burst sending (too many messages in short window)
        3. Sending outside active hours
        4. No engagement / one-way messaging
        5. High new-recipient ratio
        6. Rapid sequential sends (< 30s apart)
        7. Exceeding hourly/daily limits
        """
        patterns = []
        total_risk_score = 0

        stats_result = await self.db.execute(
            select(ProfileStatistics).where(ProfileStatistics.profile_id == profile.id)
        )
        stats = stats_result.scalar_one_or_none()

        # --- Pattern 1: Duplicate content ---
        dup_score, dup_detail = await self._check_duplicate_content(profile.id)
        if dup_score > 0:
            patterns.append({
                "pattern": "duplicate_content",
                "risk_score": dup_score,
                "detail": dup_detail,
                "recommendation": "Vary your message content. Use templates with personalization."
            })
            total_risk_score += dup_score

        # --- Pattern 2: Burst sending ---
        burst_score, burst_detail = await self._check_burst_sending(profile.id, stats)
        if burst_score > 0:
            patterns.append({
                "pattern": "burst_sending",
                "risk_score": burst_score,
                "detail": burst_detail,
                "recommendation": "Increase cooldown between messages. Use the adaptive cooldown engine."
            })
            total_risk_score += burst_score

        # --- Pattern 3: Outside active hours ---
        hours_score, hours_detail = self._check_active_hours(package)
        if hours_score > 0:
            patterns.append({
                "pattern": "outside_active_hours",
                "risk_score": hours_score,
                "detail": hours_detail,
                "recommendation": "Schedule messages within active hours window."
            })
            total_risk_score += hours_score

        # --- Pattern 4: No engagement ---
        engagement_score, engagement_detail = self._check_engagement(stats)
        if engagement_score > 0:
            patterns.append({
                "pattern": "no_engagement",
                "risk_score": engagement_score,
                "detail": engagement_detail,
                "recommendation": "Mix open messages with reply conversations. Ensure recipients are valid."
            })
            total_risk_score += engagement_score

        # --- Pattern 5: Rapid sequential sends ---
        rapid_score, rapid_detail = await self._check_rapid_sends(profile.id)
        if rapid_score > 0:
            patterns.append({
                "pattern": "rapid_sequential_sends",
                "risk_score": rapid_score,
                "detail": rapid_detail,
                "recommendation": "Enforce minimum 60-second gaps between messages."
            })
            total_risk_score += rapid_score

        # --- Pattern 6: Limit proximity ---
        limit_score, limit_detail = self._check_limit_proximity(stats, package)
        if limit_score > 0:
            patterns.append({
                "pattern": "approaching_limits",
                "risk_score": limit_score,
                "detail": limit_detail,
                "recommendation": "Reduce sending rate or increase limits carefully."
            })
            total_risk_score += limit_score

        # --- Pattern 7: High failure rate ---
        failure_score, failure_detail = self._check_failure_rate(stats)
        if failure_score > 0:
            patterns.append({
                "pattern": "high_failure_rate",
                "risk_score": failure_score,
                "detail": failure_detail,
                "recommendation": "Check recipient numbers validity. Review error messages."
            })
            total_risk_score += failure_score

        # Cap total risk at 100
        total_risk_score = min(100, total_risk_score)

        # Determine overall risk level
        if total_risk_score <= 15:
            risk_level = "low"
        elif total_risk_score <= 40:
            risk_level = "medium"
        elif total_risk_score <= 70:
            risk_level = "high"
        else:
            risk_level = "critical"

        # Create alert if risk is high
        if risk_level in ("high", "critical") and package.alert_risk_score_threshold:
            if total_risk_score >= package.alert_risk_score_threshold:
                await self._create_risk_alert(profile, package, patterns, total_risk_score, risk_level)

        return {
            "profile_id": str(profile.id),
            "profile_name": profile.name,
            "total_risk_score": total_risk_score,
            "risk_level": risk_level,
            "patterns": patterns,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }

    async def _check_duplicate_content(self, profile_id: UUID) -> tuple:
        """Check for duplicate message content sent to different recipients."""
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        result = await self.db.execute(
            select(
                DeliveryLog.message_id,
                func.count(DeliveryLog.id).label("count")
            ).where(
                DeliveryLog.profile_id == profile_id,
                DeliveryLog.created_at >= one_hour_ago
            ).group_by(DeliveryLog.message_id)
            .having(func.count(DeliveryLog.id) > 10)
        )
        duplicates = result.all()

        if duplicates:
            max_count = max(row[1] for row in duplicates)
            if max_count > 50:
                return (25, f"Same message sent to {max_count} recipients in 1 hour")
            elif max_count > 20:
                return (15, f"Same message sent to {max_count} recipients in 1 hour")
            else:
                return (8, f"Same message sent to {max_count} recipients in 1 hour")
        return (0, "")

    async def _check_burst_sending(self, profile_id: UUID, stats) -> tuple:
        """Check for burst sending patterns."""
        if not stats:
            return (0, "")

        # More than 10 messages in the last 5 minutes
        five_min_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        result = await self.db.execute(
            select(func.count(DeliveryLog.id)).where(
                DeliveryLog.profile_id == profile_id,
                DeliveryLog.created_at >= five_min_ago
            )
        )
        burst_count = result.scalar() or 0

        if burst_count > 15:
            return (25, f"{burst_count} messages in last 5 minutes (extreme burst)")
        elif burst_count > 10:
            return (15, f"{burst_count} messages in last 5 minutes (burst detected)")
        elif burst_count > 7:
            return (8, f"{burst_count} messages in last 5 minutes (elevated rate)")
        return (0, "")

    def _check_active_hours(self, package: Package) -> tuple:
        """Check if current time is within active hours."""
        now = datetime.now(timezone.utc)
        current_hour = now.hour

        # active_hours_start/end are stored as strings like "04:00:00" or "04:00"
        try:
            start_hour = int(str(package.active_hours_start).split(":")[0]) if package.active_hours_start else 4
        except (ValueError, IndexError):
            start_hour = 4
        try:
            end_hour = int(str(package.active_hours_end).split(":")[0]) if package.active_hours_end else 0
        except (ValueError, IndexError):
            end_hour = 0

        if end_hour == 0:
            end_hour = 24

        if start_hour <= end_hour:
            in_active = start_hour <= current_hour < end_hour
        else:
            in_active = current_hour >= start_hour or current_hour < end_hour

        if not in_active:
            return (10, f"Sending outside active hours ({start_hour}:00 - {end_hour}:00 UTC)")
        return (0, "")

    def _check_engagement(self, stats) -> tuple:
        """Check for one-way messaging pattern."""
        if not stats:
            return (0, "")

        sent = stats.messages_sent_today
        received = stats.messages_received_today

        if sent > 20 and received == 0:
            return (20, f"Sent {sent} messages today with 0 replies received")
        elif sent > 10 and received == 0:
            return (10, f"Sent {sent} messages today with 0 replies received")
        elif sent > 30 and received < sent * 0.05:
            return (12, f"Very low engagement: {received}/{sent} reply ratio")
        return (0, "")

    async def _check_rapid_sends(self, profile_id: UUID) -> tuple:
        """Check for messages sent too close together."""
        ten_min_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
        result = await self.db.execute(
            select(DeliveryLog.sent_at).where(
                DeliveryLog.profile_id == profile_id,
                DeliveryLog.sent_at.isnot(None),
                DeliveryLog.sent_at >= ten_min_ago
            ).order_by(DeliveryLog.sent_at)
        )
        timestamps = [row[0] for row in result.all()]

        if len(timestamps) < 2:
            return (0, "")

        rapid_count = 0
        for i in range(1, len(timestamps)):
            gap = (timestamps[i] - timestamps[i-1]).total_seconds()
            if gap < 30:
                rapid_count += 1

        if rapid_count > 5:
            return (20, f"{rapid_count} messages sent within 30s of each other")
        elif rapid_count > 2:
            return (10, f"{rapid_count} messages sent within 30s of each other")
        return (0, "")

    def _check_limit_proximity(self, stats, package: Package) -> tuple:
        """Check how close the profile is to its limits."""
        if not stats:
            return (0, "")

        hourly_pct = (stats.messages_sent_hour / max(package.max_messages_per_hour, 1)) * 100
        daily_pct = (stats.messages_sent_today / max(package.max_messages_per_day, 1)) * 100
        three_hour_pct = (stats.messages_sent_3hours / max(package.max_messages_per_3hours, 1)) * 100

        max_pct = max(hourly_pct, daily_pct, three_hour_pct)

        if max_pct >= 95:
            return (15, f"At {int(max_pct)}% of rate limit capacity")
        elif max_pct >= 80:
            return (8, f"At {int(max_pct)}% of rate limit capacity")
        return (0, "")

    def _check_failure_rate(self, stats) -> tuple:
        """Check for high failure rates."""
        if not stats or stats.messages_sent_today < 5:
            return (0, "")

        failure_rate = (stats.failed_messages_today / max(stats.messages_sent_today, 1)) * 100

        if failure_rate > 30:
            return (25, f"Failure rate {int(failure_rate)}% ({stats.failed_messages_today}/{stats.messages_sent_today})")
        elif failure_rate > 15:
            return (12, f"Failure rate {int(failure_rate)}% ({stats.failed_messages_today}/{stats.messages_sent_today})")
        elif failure_rate > 8:
            return (5, f"Failure rate {int(failure_rate)}%")
        return (0, "")

    async def _create_risk_alert(self, profile: Profile, package: Package,
                                  patterns: list, risk_score: int, risk_level: str):
        """Create an alert for high-risk patterns."""
        # Avoid duplicate alerts within 2 hours
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
        existing = await self.db.execute(
            select(func.count(Alert.id)).where(
                Alert.profile_id == profile.id,
                Alert.alert_type == "high_risk_pattern",
                Alert.created_at >= two_hours_ago
            )
        )
        if (existing.scalar() or 0) > 0:
            return

        pattern_summary = "; ".join(p["detail"] for p in patterns[:3])
        alert = Alert(
            package_id=package.id,
            profile_id=profile.id,
            alert_type="high_risk_pattern",
            severity="critical" if risk_level == "critical" else "warning",
            title=f"High Risk Pattern: {profile.name} (Score: {risk_score})",
            message=f"Risk level: {risk_level}. Detected patterns: {pattern_summary}"
        )
        self.db.add(alert)
        await self.db.flush()
