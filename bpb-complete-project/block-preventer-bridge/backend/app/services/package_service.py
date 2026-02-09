"""Package Service - Business logic for package management."""
import logging
from uuid import UUID
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload
from app.models.models import Package, Profile, ProfileStatistics, MessageQueue, Message
from app.services.cooldown_service import CooldownService

logger = logging.getLogger(__name__)


class PackageService:
    """Handles all package-related business logic."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_package(self, data: dict) -> Package:
        """Create a new package."""
        package = Package(**data)
        self.db.add(package)
        await self.db.flush()
        await self.db.refresh(package)
        return package
    
    async def get_package(self, package_id: UUID) -> Optional[Package]:
        """Get a package by ID with profiles."""
        result = await self.db.execute(
            select(Package)
            .options(selectinload(Package.profiles).selectinload(Profile.statistics))
            .where(Package.id == package_id)
        )
        return result.scalar_one_or_none()
    
    async def list_packages(self) -> List[Package]:
        """List all packages."""
        result = await self.db.execute(
            select(Package).order_by(Package.created_at.desc())
        )
        return result.scalars().all()
    
    async def update_package(self, package_id: UUID, data: dict) -> Optional[Package]:
        """Update a package."""
        package = await self.get_package(package_id)
        if not package:
            return None
        
        for key, value in data.items():
            if value is not None and hasattr(package, key):
                setattr(package, key, value)
        
        await self.db.flush()
        await self.db.refresh(package)
        return package
    
    async def delete_package(self, package_id: UUID) -> bool:
        """Delete a package."""
        package = await self.get_package(package_id)
        if not package:
            return False
        await self.db.delete(package)
        await self.db.flush()
        return True
    
    async def get_package_stats(self, package_id: UUID) -> dict:
        """Get comprehensive package statistics."""
        package = await self.get_package(package_id)
        if not package:
            return {}
        
        # Get all profiles with stats
        profiles_result = await self.db.execute(
            select(Profile)
            .options(selectinload(Profile.statistics))
            .where(Profile.package_id == package_id)
        )
        profiles = profiles_result.scalars().all()
        
        total_sent_today = 0
        total_sent_hour = 0
        total_failed = 0
        profiles_stats = []
        
        for profile in profiles:
            stats = profile.statistics
            sent_today = stats.messages_sent_today if stats else 0
            sent_hour = stats.messages_sent_hour if stats else 0
            sent_3h = stats.messages_sent_3hours if stats else 0
            failed = stats.failed_messages_today if stats else 0
            success_rate = stats.success_rate_24h if stats else 100.0
            cooldown_mode = stats.cooldown_mode if stats else "normal"
            cooldown_seconds = stats.current_cooldown_seconds if stats else 0
            
            total_sent_today += sent_today
            total_sent_hour += sent_hour
            total_failed += failed
            
            profiles_stats.append({
                "profile_id": str(profile.id),
                "profile_name": profile.name,
                "status": profile.status,
                "weight_score": profile.weight_score,
                "health_score": profile.health_score,
                "risk_score": profile.risk_score,
                "messages_sent_today": sent_today,
                "messages_sent_hour": sent_hour,
                "messages_sent_3hours": sent_3h,
                "failed_messages_today": failed,
                "success_rate_24h": success_rate,
                "cooldown_mode": cooldown_mode,
                "current_cooldown_seconds": cooldown_seconds,
                "limits": {
                    "hourly": f"{sent_hour}/{package.max_messages_per_hour}",
                    "three_hour": f"{sent_3h}/{package.max_messages_per_3hours}",
                    "daily": f"{sent_today}/{package.max_messages_per_day}",
                    "hourly_pct": round(sent_hour / max(package.max_messages_per_hour, 1) * 100, 1),
                    "three_hour_pct": round(sent_3h / max(package.max_messages_per_3hours, 1) * 100, 1),
                    "daily_pct": round(sent_today / max(package.max_messages_per_day, 1) * 100, 1)
                }
            })
        
        # Get queue status
        cooldown_svc = CooldownService(self.db)
        queue_status = await cooldown_svc.get_queue_status(package_id)
        
        # Get pending messages count
        pending_result = await self.db.execute(
            select(func.count(Message.id)).where(
                Message.package_id == package_id,
                Message.status.in_(["pending", "queued", "processing"])
            )
        )
        total_pending = pending_result.scalar() or 0
        
        return {
            "package_id": str(package_id),
            "package_name": package.name,
            "total_messages_today": total_sent_today,
            "total_messages_hour": total_sent_hour,
            "total_sent": total_sent_today,
            "total_failed": total_failed,
            "total_pending": total_pending,
            "queue_size": queue_status["total_waiting"],
            "queue_mode": queue_status["queue_mode"],
            "profiles_stats": profiles_stats,
            "two_hour_trend": {}
        }
    
    async def get_package_with_queue_info(self, package_id: UUID) -> dict:
        """Get package info enriched with queue and cooldown data."""
        package = await self.get_package(package_id)
        if not package:
            return None
        
        stats = await self.get_package_stats(package_id)
        
        return {
            "package": package,
            "stats": stats
        }
