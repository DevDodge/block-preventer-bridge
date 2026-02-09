"""Distribution Service - Implements all distribution strategies."""
import random
import logging
from typing import List, Dict
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Profile, ProfileStatistics, Package

logger = logging.getLogger(__name__)


class DistributionService:
    """Handles message distribution across profiles."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
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
        
        if mode == "round_robin":
            return self._round_robin(profiles_with_stats, recipients, package)
        elif mode == "random":
            return self._random(profiles_with_stats, recipients, package)
        elif mode == "weighted":
            return self._weighted(profiles_with_stats, recipients, package)
        elif mode == "smart":
            return self._smart(profiles_with_stats, recipients, package)
        else:
            return self._round_robin(profiles_with_stats, recipients, package)
    
    def _round_robin(self, profiles_with_stats, recipients, package) -> Dict[str, List[str]]:
        """Evenly distribute recipients across profiles."""
        distribution = {str(p.id): [] for p, _ in profiles_with_stats}
        profile_ids = [str(p.id) for p, _ in profiles_with_stats]
        
        for i, recipient in enumerate(recipients):
            profile_id = profile_ids[i % len(profile_ids)]
            # Check if profile hasn't reached daily limit
            profile, stats = profiles_with_stats[i % len(profiles_with_stats)]
            sent_today = stats.messages_sent_today if stats else 0
            if sent_today + len(distribution[profile_id]) < package.max_messages_per_day:
                distribution[profile_id].append(recipient)
            else:
                # Find next available profile
                for j in range(len(profiles_with_stats)):
                    alt_idx = (i + j + 1) % len(profiles_with_stats)
                    alt_profile, alt_stats = profiles_with_stats[alt_idx]
                    alt_sent = alt_stats.messages_sent_today if alt_stats else 0
                    alt_id = str(alt_profile.id)
                    if alt_sent + len(distribution[alt_id]) < package.max_messages_per_day:
                        distribution[alt_id].append(recipient)
                        break
        
        return {k: v for k, v in distribution.items() if v}
    
    def _random(self, profiles_with_stats, recipients, package) -> Dict[str, List[str]]:
        """Randomly assign recipients to profiles."""
        distribution = {str(p.id): [] for p, _ in profiles_with_stats}
        available = [(p, s) for p, s in profiles_with_stats]
        
        for recipient in recipients:
            random.shuffle(available)
            assigned = False
            for profile, stats in available:
                pid = str(profile.id)
                sent_today = stats.messages_sent_today if stats else 0
                if sent_today + len(distribution[pid]) < package.max_messages_per_day:
                    distribution[pid].append(recipient)
                    assigned = True
                    break
            if not assigned and available:
                # Force assign to least loaded
                min_profile = min(available, key=lambda x: len(distribution[str(x[0].id)]))
                distribution[str(min_profile[0].id)].append(recipient)
        
        return {k: v for k, v in distribution.items() if v}
    
    def _weighted(self, profiles_with_stats, recipients, package) -> Dict[str, List[str]]:
        """Distribute based on profile weight scores."""
        distribution = {str(p.id): [] for p, _ in profiles_with_stats}
        
        # Calculate total weight
        total_weight = sum(max(p.weight_score, 1) for p, _ in profiles_with_stats)
        if total_weight == 0:
            return self._round_robin(profiles_with_stats, recipients, package)
        
        # Calculate share per profile
        shares = {}
        for profile, stats in profiles_with_stats:
            share = max(profile.weight_score, 1) / total_weight
            shares[str(profile.id)] = max(1, int(len(recipients) * share))
        
        # Distribute
        recipient_idx = 0
        for profile, stats in profiles_with_stats:
            pid = str(profile.id)
            count = min(shares[pid], len(recipients) - recipient_idx)
            sent_today = stats.messages_sent_today if stats else 0
            max_can_send = max(0, package.max_messages_per_day - sent_today)
            count = min(count, max_can_send)
            
            distribution[pid] = recipients[recipient_idx:recipient_idx + count]
            recipient_idx += count
        
        # Assign remaining
        while recipient_idx < len(recipients):
            for profile, stats in profiles_with_stats:
                if recipient_idx >= len(recipients):
                    break
                pid = str(profile.id)
                sent_today = stats.messages_sent_today if stats else 0
                if sent_today + len(distribution[pid]) < package.max_messages_per_day:
                    distribution[pid].append(recipients[recipient_idx])
                    recipient_idx += 1
        
        return {k: v for k, v in distribution.items() if v}
    
    def _smart(self, profiles_with_stats, recipients, package) -> Dict[str, List[str]]:
        """Smart distribution considering health, limits, and usage."""
        distribution = {str(p.id): [] for p, _ in profiles_with_stats}
        
        # Score each profile for smart routing
        scored_profiles = []
        for profile, stats in profiles_with_stats:
            sent_today = stats.messages_sent_today if stats else 0
            sent_hour = stats.messages_sent_hour if stats else 0
            sent_3hours = stats.messages_sent_3hours if stats else 0
            success_rate = stats.success_rate_24h if stats else 100.0
            
            # Calculate remaining capacity
            daily_remaining = max(0, package.max_messages_per_day - sent_today)
            hourly_remaining = max(0, package.max_messages_per_hour - sent_hour)
            three_hour_remaining = max(0, package.max_messages_per_3hours - sent_3hours)
            
            capacity = min(daily_remaining, hourly_remaining, three_hour_remaining)
            
            # Smart score = weight * health * capacity factor * success rate
            smart_score = (
                max(profile.weight_score, 1) *
                (profile.health_score / 100) *
                (capacity / max(package.max_messages_per_day, 1)) *
                (success_rate / 100)
            )
            
            # Penalize high-risk profiles
            if profile.risk_score > 50:
                smart_score *= 0.5
            elif profile.risk_score > 20:
                smart_score *= 0.8
            
            scored_profiles.append((profile, stats, smart_score, capacity))
        
        # Sort by smart score descending
        scored_profiles.sort(key=lambda x: x[2], reverse=True)
        
        # Distribute proportionally to smart scores
        total_score = sum(s for _, _, s, _ in scored_profiles)
        if total_score == 0:
            return self._round_robin(profiles_with_stats, recipients, package)
        
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
