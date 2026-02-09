"""Weight Calculator Service - Profile weight scoring system."""
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Profile, ProfileStatistics

logger = logging.getLogger(__name__)


class WeightService:
    """Calculates and updates profile weight scores."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def calculate_weight(self, profile: Profile) -> dict:
        """
        Calculate weight score for a profile.
        
        Formula:
        weight = base_weight 
               + (account_age_months × 1)
               - (messages_today ÷ 20)
               + (success_rate > 95% ? 2 : 0)
               - (failed_count × 3)
               + (hours_since_block ÷ 24)
               + (manual_priority × 2)
        """
        # Get statistics
        stats_result = await self.db.execute(
            select(ProfileStatistics).where(ProfileStatistics.profile_id == profile.id)
        )
        stats = stats_result.scalar_one_or_none()
        
        base_weight = 10.0
        
        # Account age bonus
        account_age_bonus = profile.account_age_months * 1.0
        
        # Usage penalty
        messages_today = stats.messages_sent_today if stats else 0
        usage_penalty = messages_today / 20.0
        
        # Success rate bonus
        success_rate = stats.success_rate_24h if stats else 100.0
        success_bonus = 2.0 if success_rate > 95.0 else 0.0
        
        # Failure penalty
        failed_count = stats.failed_messages_today if stats else 0
        failure_penalty = failed_count * 3.0
        
        # Recovery bonus (hours since last block)
        recovery_bonus = 0.0
        if profile.last_block_at:
            hours_since_block = (datetime.now(timezone.utc) - profile.last_block_at).total_seconds() / 3600
            recovery_bonus = hours_since_block / 24.0
        else:
            recovery_bonus = 30.0  # Never blocked = max recovery bonus
        
        # Manual priority bonus
        manual_priority_bonus = profile.manual_priority * 2.0
        
        # Calculate total
        total_weight = (
            base_weight
            + account_age_bonus
            - usage_penalty
            + success_bonus
            - failure_penalty
            + recovery_bonus
            + manual_priority_bonus
        )
        
        # Minimum weight is 1
        total_weight = max(1.0, total_weight)
        
        # Update profile
        profile.weight_score = round(total_weight, 2)
        await self.db.flush()
        
        return {
            "base_weight": base_weight,
            "account_age_bonus": round(account_age_bonus, 2),
            "usage_penalty": round(usage_penalty, 2),
            "success_bonus": success_bonus,
            "failure_penalty": failure_penalty,
            "recovery_bonus": round(recovery_bonus, 2),
            "manual_priority_bonus": manual_priority_bonus,
            "total_weight": round(total_weight, 2)
        }
    
    async def calculate_risk(self, profile: Profile) -> dict:
        """
        Calculate risk score for a profile.
        
        Risk factors:
        - Same message to many recipients (hash check)
        - Sending faster than 1 msg/min
        - Burst sending (10+ in 5 minutes)
        - No replies received (broadcasts)
        - Many new recipients
        """
        stats_result = await self.db.execute(
            select(ProfileStatistics).where(ProfileStatistics.profile_id == profile.id)
        )
        stats = stats_result.scalar_one_or_none()
        
        risk_score = 0
        
        # Too fast penalty (more than 1 msg per minute in the last hour)
        sent_hour = stats.messages_sent_hour if stats else 0
        too_fast_penalty = 20 if sent_hour > 60 else 0
        risk_score += too_fast_penalty
        
        # Burst penalty (high 3-hour usage relative to limit)
        sent_3h = stats.messages_sent_3hours if stats else 0
        burst_penalty = 25 if sent_3h > 40 else 0
        risk_score += burst_penalty
        
        # No engagement penalty
        received = stats.messages_received_today if stats else 0
        sent_today = stats.messages_sent_today if stats else 0
        no_engagement_penalty = 0
        if sent_today > 10 and received == 0:
            no_engagement_penalty = 15
        risk_score += no_engagement_penalty
        
        # Low success rate penalty
        success_rate = stats.success_rate_24h if stats else 100.0
        duplicate_penalty = 0
        if success_rate < 80:
            duplicate_penalty = 30
        elif success_rate < 90:
            duplicate_penalty = 15
        risk_score += duplicate_penalty
        
        # Failed messages penalty
        failed = stats.failed_messages_today if stats else 0
        new_recipients_penalty = min(10, failed * 2)
        risk_score += new_recipients_penalty
        
        # Cap at 100
        risk_score = min(100, risk_score)
        
        # Determine risk level
        if risk_score <= 20:
            risk_level = "low"
        elif risk_score <= 50:
            risk_level = "medium"
        elif risk_score <= 80:
            risk_level = "high"
        else:
            risk_level = "critical"
        
        # Update profile
        profile.risk_score = risk_score
        
        # Update health score (inverse of risk)
        profile.health_score = max(0, 100 - risk_score)
        await self.db.flush()
        
        return {
            "duplicate_message_penalty": duplicate_penalty,
            "too_fast_penalty": too_fast_penalty,
            "burst_penalty": burst_penalty,
            "no_engagement_penalty": no_engagement_penalty,
            "new_recipients_penalty": new_recipients_penalty,
            "total_risk": risk_score,
            "risk_level": risk_level
        }
