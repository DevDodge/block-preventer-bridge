"""Distribution Service - Implements all distribution strategies.

IMPORTANT: All strategies are now "queue-aware". When distributing recipients,
they consider the number of PENDING queue items per profile (not just messages_sent_today).
This ensures that multiple single-recipient requests are distributed across profiles
in the same way as a single multi-recipient request.

Example with 2 profiles and round_robin:
- Multi-recipient: {A: [r1, r3], B: [r2, r4]} ← correct
- Single-recipient x4 (OLD): {A: [r1]}, {A: [r2]}, {A: [r3]}, {A: [r4]} ← WRONG, all to A
- Single-recipient x4 (NEW): {A: [r1]}, {B: [r2]}, {A: [r3]}, {B: [r4]} ← correct
"""
import random
import logging
from typing import List, Dict
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import Profile, ProfileStatistics, Package, MessageQueue

logger = logging.getLogger(__name__)


def _get_profile_limit(profile: Profile, package: Package, field: str) -> int:
    """Get the effective limit for a profile. Uses profile-level override if set, otherwise package default."""
    profile_val = getattr(profile, field, None)
    if profile_val is not None:
        return profile_val
    return getattr(package, field)


class DistributionService:
    """Handles message distribution across profiles."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _get_pending_counts(self, profile_ids: List[UUID]) -> Dict[str, int]:
        """
        Get the number of pending (waiting) queue items per profile.
        This is the key to queue-aware distribution.
        """
        if not profile_ids:
            return {}
        
        result = await self.db.execute(
            select(
                MessageQueue.profile_id,
                func.count(MessageQueue.id)
            ).where(
                MessageQueue.profile_id.in_(profile_ids),
                MessageQueue.status == "waiting"
            ).group_by(MessageQueue.profile_id)
        )
        
        counts = {str(row[0]): row[1] for row in result.all()}
        # Ensure all profiles have an entry (0 if no pending items)
        for pid in profile_ids:
            if str(pid) not in counts:
                counts[str(pid)] = 0
        
        return counts
    
    async def distribute(self, package: Package, recipients: List[str]) -> Dict[str, List[str]]:
        """Distribute recipients across profiles using the package's strategy."""
        mode = package.distribution_mode
        
        # Get active profiles with stats
        result = await self.db.execute(
            select(Profile).where(
                Profile.package_id == package.id,
                Profile.status == "active"
            )
        )
        profiles = result.scalars().all()
        
        if not profiles:
            raise ValueError("No active profiles available in this package")
        
        # Load statistics for each profile
        profiles_with_stats = []
        for profile in profiles:
            stats_result = await self.db.execute(
                select(ProfileStatistics).where(ProfileStatistics.profile_id == profile.id)
            )
            stats = stats_result.scalar_one_or_none()
            profiles_with_stats.append((profile, stats))
        
        # Get pending queue counts for queue-aware distribution
        profile_ids = [p.id for p in profiles]
        pending_counts = await self._get_pending_counts(profile_ids)
        
        logger.info(
            f"Distribution mode={mode}, profiles={len(profiles)}, "
            f"recipients={len(recipients)}, pending_counts={pending_counts}"
        )
        
        if mode == "round_robin":
            return self._round_robin(profiles_with_stats, recipients, package, pending_counts)
        elif mode == "random":
            return self._random(profiles_with_stats, recipients, package, pending_counts)
        elif mode == "weighted":
            return self._weighted(profiles_with_stats, recipients, package, pending_counts)
        elif mode == "smart":
            return self._smart(profiles_with_stats, recipients, package, pending_counts)
        else:
            return self._round_robin(profiles_with_stats, recipients, package, pending_counts)
    
    def _round_robin(self, profiles_with_stats, recipients, package, pending_counts) -> Dict[str, List[str]]:
        """
        Evenly distribute recipients across profiles using queue-aware round-robin.
        
        Instead of using `i % num_profiles` (which always starts at 0),
        we calculate the effective load (sent_today + pending_queue_items)
        and use that to determine the starting offset. This means:
        - If Profile A has 5 pending and Profile B has 3 pending,
          the next recipient goes to Profile B (the less loaded one).
        """
        distribution = {str(p.id): [] for p, _ in profiles_with_stats}
        profile_ids = [str(p.id) for p, _ in profiles_with_stats]
        num_profiles = len(profile_ids)
        
        if num_profiles == 0:
            return distribution
        
        # Calculate total load per profile (sent + pending queue items)
        # This determines the round-robin starting position
        profile_loads = []
        for p, stats in profiles_with_stats:
            pid = str(p.id)
            sent_today = stats.messages_sent_today if stats else 0
            pending = pending_counts.get(pid, 0)
            total_load = sent_today + pending
            profile_loads.append((pid, total_load, p, stats))
        
        # Calculate the total messages across all profiles to find the round-robin offset
        total_messages = sum(load for _, load, _, _ in profile_loads)
        # The starting index is where the round-robin would be if all previous
        # messages had been distributed in round-robin order
        start_offset = total_messages % num_profiles
        
        logger.info(
            f"Round-robin: total_messages={total_messages}, start_offset={start_offset}, "
            f"loads={[(pid, load) for pid, load, _, _ in profile_loads]}"
        )
        
        for i, recipient in enumerate(recipients):
            # Use the offset so single-recipient requests rotate across profiles
            idx = (start_offset + i) % num_profiles
            profile_id = profile_ids[idx]
            profile, stats = profiles_with_stats[idx]
            
            sent_today = stats.messages_sent_today if stats else 0
            pending = pending_counts.get(profile_id, 0)
            daily_limit = _get_profile_limit(profile, package, "max_messages_per_day")
            
            if sent_today + pending + len(distribution[profile_id]) < daily_limit:
                distribution[profile_id].append(recipient)
            else:
                # This profile is at capacity, find an alternative
                for j in range(num_profiles):
                    alt_idx = (idx + j + 1) % num_profiles
                    alt_profile, alt_stats = profiles_with_stats[alt_idx]
                    alt_sent = alt_stats.messages_sent_today if alt_stats else 0
                    alt_id = str(alt_profile.id)
                    alt_pending = pending_counts.get(alt_id, 0)
                    alt_daily_limit = _get_profile_limit(alt_profile, package, "max_messages_per_day")
                    if alt_sent + alt_pending + len(distribution[alt_id]) < alt_daily_limit:
                        distribution[alt_id].append(recipient)
                        break
        
        return {k: v for k, v in distribution.items() if v}
    
    def _random(self, profiles_with_stats, recipients, package, pending_counts) -> Dict[str, List[str]]:
        """Randomly assign recipients to profiles, considering queue load."""
        distribution = {str(p.id): [] for p, _ in profiles_with_stats}
        available = [(p, s) for p, s in profiles_with_stats]
        
        for recipient in recipients:
            random.shuffle(available)
            assigned = False
            for profile, stats in available:
                pid = str(profile.id)
                sent_today = stats.messages_sent_today if stats else 0
                pending = pending_counts.get(pid, 0)
                daily_limit = _get_profile_limit(profile, package, "max_messages_per_day")
                if sent_today + pending + len(distribution[pid]) < daily_limit:
                    distribution[pid].append(recipient)
                    assigned = True
                    break
            if not assigned and available:
                # Pick the profile with the least total load
                min_profile = min(
                    available,
                    key=lambda x: (
                        (x[1].messages_sent_today if x[1] else 0) +
                        pending_counts.get(str(x[0].id), 0) +
                        len(distribution[str(x[0].id)])
                    )
                )
                distribution[str(min_profile[0].id)].append(recipient)
        
        return {k: v for k, v in distribution.items() if v}
    
    def _weighted(self, profiles_with_stats, recipients, package, pending_counts) -> Dict[str, List[str]]:
        """Distribute based on profile weight scores, considering queue load."""
        distribution = {str(p.id): [] for p, _ in profiles_with_stats}
        
        total_weight = sum(max(p.weight_score, 1) for p, _ in profiles_with_stats)
        if total_weight == 0:
            return self._round_robin(profiles_with_stats, recipients, package, pending_counts)
        
        shares = {}
        for profile, stats in profiles_with_stats:
            share = max(profile.weight_score, 1) / total_weight
            shares[str(profile.id)] = max(1, int(len(recipients) * share))
        
        recipient_idx = 0
        for profile, stats in profiles_with_stats:
            pid = str(profile.id)
            count = min(shares[pid], len(recipients) - recipient_idx)
            sent_today = stats.messages_sent_today if stats else 0
            pending = pending_counts.get(pid, 0)
            daily_limit = _get_profile_limit(profile, package, "max_messages_per_day")
            max_can_send = max(0, daily_limit - sent_today - pending)
            count = min(count, max_can_send)
            
            distribution[pid] = recipients[recipient_idx:recipient_idx + count]
            recipient_idx += count
        
        while recipient_idx < len(recipients):
            for profile, stats in profiles_with_stats:
                if recipient_idx >= len(recipients):
                    break
                pid = str(profile.id)
                sent_today = stats.messages_sent_today if stats else 0
                pending = pending_counts.get(pid, 0)
                daily_limit = _get_profile_limit(profile, package, "max_messages_per_day")
                if sent_today + pending + len(distribution[pid]) < daily_limit:
                    distribution[pid].append(recipients[recipient_idx])
                    recipient_idx += 1
        
        return {k: v for k, v in distribution.items() if v}
    
    def _smart(self, profiles_with_stats, recipients, package, pending_counts) -> Dict[str, List[str]]:
        """Smart distribution considering health, per-profile limits, usage, AND queue load."""
        distribution = {str(p.id): [] for p, _ in profiles_with_stats}
        
        scored_profiles = []
        for profile, stats in profiles_with_stats:
            sent_today = stats.messages_sent_today if stats else 0
            sent_hour = stats.messages_sent_hour if stats else 0
            sent_3hours = stats.messages_sent_3hours if stats else 0
            success_rate = stats.success_rate_24h if stats else 100.0
            pending = pending_counts.get(str(profile.id), 0)
            
            # Use per-profile limits (fallback to package defaults)
            p_daily = _get_profile_limit(profile, package, "max_messages_per_day")
            p_hourly = _get_profile_limit(profile, package, "max_messages_per_hour")
            p_3hours = _get_profile_limit(profile, package, "max_messages_per_3hours")
            
            # Include pending queue items in capacity calculation
            daily_remaining = max(0, p_daily - sent_today - pending)
            hourly_remaining = max(0, p_hourly - sent_hour - pending)
            three_hour_remaining = max(0, p_3hours - sent_3hours - pending)
            
            capacity = min(daily_remaining, hourly_remaining, three_hour_remaining)
            
            # Smart score uses per-profile daily limit for capacity factor
            smart_score = (
                max(profile.weight_score, 1) *
                (profile.health_score / 100) *
                (capacity / max(p_daily, 1)) *
                (success_rate / 100)
            )
            
            # Penalize high-risk profiles
            if profile.risk_score > 50:
                smart_score *= 0.5
            elif profile.risk_score > 20:
                smart_score *= 0.8
            
            scored_profiles.append((profile, stats, smart_score, capacity))
            logger.info(
                f"Smart Score for {profile.name}: score={smart_score:.2f}, "
                f"capacity={capacity}, pending={pending}, "
                f"limits=({p_hourly}h/{p_3hours}x3h/{p_daily}d), "
                f"health={profile.health_score}, risk={profile.risk_score}, success={success_rate:.1f}%"
            )
        
        scored_profiles.sort(key=lambda x: x[2], reverse=True)
        
        total_score = sum(s for _, _, s, _ in scored_profiles)
        if total_score == 0:
            return self._round_robin(profiles_with_stats, recipients, package, pending_counts)
        
        recipient_idx = 0
        for profile, stats, score, capacity in scored_profiles:
            if recipient_idx >= len(recipients):
                break
            pid = str(profile.id)
            share = max(1, int(len(recipients) * (score / total_score)))
            count = min(share, capacity, len(recipients) - recipient_idx)
            distribution[pid] = recipients[recipient_idx:recipient_idx + count]
            recipient_idx += count
        
        # Assign remaining
        while recipient_idx < len(recipients):
            assigned = False
            for profile, stats, score, capacity in scored_profiles:
                if recipient_idx >= len(recipients):
                    break
                pid = str(profile.id)
                if len(distribution[pid]) < capacity:
                    distribution[pid].append(recipients[recipient_idx])
                    recipient_idx += 1
                    assigned = True
                    break
            if not assigned:
                break
        
        return {k: v for k, v in distribution.items() if v}
