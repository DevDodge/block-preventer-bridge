"""Profile Service - Business logic for profile management."""
import logging
from uuid import UUID
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.models.models import Profile, ProfileStatistics, Package
from app.services.weight_service import WeightService

logger = logging.getLogger(__name__)


class ProfileService:
    """Handles all profile-related business logic."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.weight_service = WeightService(db)
    
    async def create_profile(self, package_id: UUID, data: dict) -> Profile:
        """Create a new profile and initialize its statistics."""
        # Verify package exists
        pkg_result = await self.db.execute(
            select(Package).where(Package.id == package_id)
        )
        package = pkg_result.scalar_one_or_none()
        if not package:
            raise ValueError(f"Package {package_id} not found")
        
        profile = Profile(package_id=package_id, **data)
        self.db.add(profile)
        await self.db.flush()
        
        # Create statistics record
        stats = ProfileStatistics(profile_id=profile.id)
        self.db.add(stats)
        await self.db.flush()
        
        # Calculate initial weight
        await self.weight_service.calculate_weight(profile)
        
        await self.db.refresh(profile)
        return profile
    
    async def get_profile(self, profile_id: UUID) -> Optional[Profile]:
        """Get a profile by ID with statistics."""
        result = await self.db.execute(
            select(Profile)
            .options(selectinload(Profile.statistics))
            .where(Profile.id == profile_id)
        )
        return result.scalar_one_or_none()
    
    async def list_profiles(self, package_id: UUID) -> List[Profile]:
        """List all profiles in a package."""
        result = await self.db.execute(
            select(Profile)
            .options(selectinload(Profile.statistics))
            .where(Profile.package_id == package_id)
            .order_by(Profile.created_at.desc())
        )
        return result.scalars().all()
    
    async def update_profile(self, profile_id: UUID, data: dict) -> Optional[Profile]:
        """Update a profile."""
        profile = await self.get_profile(profile_id)
        if not profile:
            return None
        
        for key, value in data.items():
            if value is not None and hasattr(profile, key):
                setattr(profile, key, value)
        
        # Recalculate weight after update
        await self.weight_service.calculate_weight(profile)
        
        await self.db.flush()
        await self.db.refresh(profile)
        return profile
    
    async def delete_profile(self, profile_id: UUID) -> bool:
        """Delete a profile."""
        profile = await self.get_profile(profile_id)
        if not profile:
            return False
        await self.db.delete(profile)
        await self.db.flush()
        return True
    
    async def toggle_status(self, profile_id: UUID, new_status: str) -> Optional[Profile]:
        """Toggle profile status."""
        profile = await self.get_profile(profile_id)
        if not profile:
            return None
        
        profile.status = new_status
        if new_status == "paused":
            profile.pause_reason = "Manually paused by user"
        elif new_status == "active":
            profile.pause_reason = None
            profile.resume_at = None
        
        await self.db.flush()
        await self.db.refresh(profile)
        return profile
    
    async def get_health(self, profile_id: UUID) -> dict:
        """Get comprehensive health report for a profile."""
        profile = await self.get_profile(profile_id)
        if not profile:
            return None
        
        # Calculate weight and risk
        weight_breakdown = await self.weight_service.calculate_weight(profile)
        risk_breakdown = await self.weight_service.calculate_risk(profile)
        
        stats = profile.statistics
        stats_data = {
            "messages_sent_total": stats.messages_sent_total if stats else 0,
            "messages_sent_today": stats.messages_sent_today if stats else 0,
            "messages_sent_hour": stats.messages_sent_hour if stats else 0,
            "messages_sent_3hours": stats.messages_sent_3hours if stats else 0,
            "messages_received_today": stats.messages_received_today if stats else 0,
            "failed_messages_today": stats.failed_messages_today if stats else 0,
            "failed_messages_hour": stats.failed_messages_hour if stats else 0,
            "success_rate_24h": stats.success_rate_24h if stats else 100.0,
            "avg_response_time_ms": stats.avg_response_time_ms if stats else 0.0,
            "current_cooldown_seconds": stats.current_cooldown_seconds if stats else 0,
            "cooldown_mode": stats.cooldown_mode if stats else "normal"
        }
        
        # Get package for limits
        pkg_result = await self.db.execute(
            select(Package).where(Package.id == profile.package_id)
        )
        package = pkg_result.scalar_one_or_none()
        
        limits_usage = {}
        if package:
            sent_hour = stats.messages_sent_hour if stats else 0
            sent_3h = stats.messages_sent_3hours if stats else 0
            sent_day = stats.messages_sent_today if stats else 0
            limits_usage = {
                "hourly": {"used": sent_hour, "limit": package.max_messages_per_hour, "pct": round(sent_hour / max(package.max_messages_per_hour, 1) * 100, 1)},
                "three_hour": {"used": sent_3h, "limit": package.max_messages_per_3hours, "pct": round(sent_3h / max(package.max_messages_per_3hours, 1) * 100, 1)},
                "daily": {"used": sent_day, "limit": package.max_messages_per_day, "pct": round(sent_day / max(package.max_messages_per_day, 1) * 100, 1)}
            }
        
        # Generate recommendations
        recommendations = []
        if risk_breakdown["total_risk"] > 50:
            recommendations.append("High risk detected. Consider pausing this profile temporarily.")
        if stats_data["success_rate_24h"] < 90:
            recommendations.append("Success rate is below 90%. Check for delivery issues.")
        if stats_data["failed_messages_today"] > 3:
            recommendations.append("Multiple failures detected today. Monitor closely.")
        if weight_breakdown["total_weight"] < 10:
            recommendations.append("Low weight score. This profile will receive fewer messages.")
        
        return {
            "profile_id": str(profile.id),
            "profile_name": profile.name,
            "status": profile.status,
            "health_score": profile.health_score,
            "risk_score": profile.risk_score,
            "risk_level": risk_breakdown["risk_level"],
            "weight_score": profile.weight_score,
            "weight_breakdown": weight_breakdown,
            "risk_breakdown": risk_breakdown,
            "statistics": stats_data,
            "limits_usage": limits_usage,
            "recommendations": recommendations
        }
    
    async def recalculate_all_weights(self, package_id: UUID):
        """Recalculate weights for all profiles in a package."""
        profiles = await self.list_profiles(package_id)
        for profile in profiles:
            await self.weight_service.calculate_weight(profile)
            await self.weight_service.calculate_risk(profile)
