"""API routes for Package management."""
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.services.package_service import PackageService
from app.schemas.package import (
    PackageCreate, PackageUpdate, PackageResponse, PackageListResponse, PackageStatsResponse
)

router = APIRouter(prefix="/packages", tags=["Packages"])


@router.get("", response_model=List[dict])
async def list_packages(db: AsyncSession = Depends(get_db)):
    """List all packages with summary info."""
    service = PackageService(db)
    packages = await service.list_packages()
    
    result = []
    for pkg in packages:
        stats = await service.get_package_stats(pkg.id)
        result.append({
            "id": str(pkg.id),
            "name": pkg.name,
            "description": pkg.description,
            "status": pkg.status,
            "distribution_mode": pkg.distribution_mode,
            "total_profiles": len(pkg.profiles) if hasattr(pkg, 'profiles') and pkg.profiles else 0,
            "active_profiles": 0,
            "messages_today": stats.get("total_messages_today", 0),
            "queue_size": stats.get("queue_size", 0),
            "queue_mode": stats.get("queue_mode", "normal"),
            "created_at": pkg.created_at.isoformat() if pkg.created_at else None
        })
    
    return result


@router.post("", response_model=dict, status_code=201)
async def create_package(data: PackageCreate, db: AsyncSession = Depends(get_db)):
    """Create a new package."""
    service = PackageService(db)
    package = await service.create_package(data.model_dump())
    return {
        "id": str(package.id),
        "name": package.name,
        "status": package.status,
        "message": "Package created successfully"
    }


@router.get("/{package_id}", response_model=dict)
async def get_package(package_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get package details with profiles and limits."""
    service = PackageService(db)
    package = await service.get_package(package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    stats = await service.get_package_stats(package_id)
    
    profiles_data = []
    if package.profiles:
        for p in package.profiles:
            s = p.statistics
            profiles_data.append({
                "id": str(p.id),
                "name": p.name,
                "phone_number": p.phone_number,
                "status": p.status,
                "weight_score": p.weight_score,
                "health_score": p.health_score,
                "risk_score": p.risk_score,
                "manual_priority": p.manual_priority,
                "account_age_months": p.account_age_months,
                "max_messages_per_hour": p.max_messages_per_hour,
                "max_messages_per_3hours": p.max_messages_per_3hours,
                "max_messages_per_day": p.max_messages_per_day,
                "auto_adjust_limits": p.auto_adjust_limits,
                "auto_adjust_interval_minutes": p.auto_adjust_interval_minutes,
                "messages_sent_today": s.messages_sent_today if s else 0,
                "messages_sent_hour": s.messages_sent_hour if s else 0,
                "messages_sent_3hours": s.messages_sent_3hours if s else 0,
                "success_rate_24h": s.success_rate_24h if s else 100.0,
                "cooldown_mode": s.cooldown_mode if s else "normal",
                "current_cooldown_seconds": s.current_cooldown_seconds if s else 0,
                "failed_messages_today": s.failed_messages_today if s else 0,
                "last_message_at": p.last_message_at.isoformat() if p.last_message_at else None
            })
    
    return {
        "id": str(package.id),
        "name": package.name,
        "description": package.description,
        "status": package.status,
        "distribution_mode": package.distribution_mode,
        "max_messages_per_hour": package.max_messages_per_hour,
        "max_messages_per_3hours": package.max_messages_per_3hours,
        "max_messages_per_day": package.max_messages_per_day,
        "max_concurrent_sends": package.max_concurrent_sends,
        "active_hours_start": str(package.active_hours_start) if package.active_hours_start else "04:00:00",
        "active_hours_end": str(package.active_hours_end) if package.active_hours_end else "00:00:00",
        "freeze_duration_hours": package.freeze_duration_hours,
        "rush_hour_threshold": package.rush_hour_threshold,
        "rush_hour_multiplier": package.rush_hour_multiplier,
        "quiet_mode_threshold": package.quiet_mode_threshold,
        "quiet_mode_multiplier": package.quiet_mode_multiplier,
        "auto_adjust_limits": package.auto_adjust_limits,
        "auto_adjust_interval_minutes": package.auto_adjust_interval_minutes or 360,
        "auto_pause_on_failures": package.auto_pause_on_failures,
        "auto_pause_failure_threshold": package.auto_pause_failure_threshold,
        "auto_pause_success_rate_threshold": package.auto_pause_success_rate_threshold,
        "alert_risk_score_threshold": package.alert_risk_score_threshold,
        "retry_failed_messages": package.retry_failed_messages,
        "retry_attempts": package.retry_attempts,
        "retry_delay_seconds": package.retry_delay_seconds,
        "profiles": profiles_data,
        "total_profiles": len(profiles_data),
        "active_profiles": len([p for p in profiles_data if p["status"] == "active"]),
        "queue_size": stats.get("queue_size", 0),
        "queue_mode": stats.get("queue_mode", "normal"),
        "created_at": package.created_at.isoformat() if package.created_at else None,
        "updated_at": package.updated_at.isoformat() if package.updated_at else None
    }


@router.put("/{package_id}", response_model=dict)
async def update_package(package_id: UUID, data: PackageUpdate, db: AsyncSession = Depends(get_db)):
    """Update package settings."""
    service = PackageService(db)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    package = await service.update_package(package_id, update_data)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"id": str(package.id), "message": "Package updated successfully"}


@router.delete("/{package_id}")
async def delete_package(package_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a package and all its data."""
    service = PackageService(db)
    deleted = await service.delete_package(package_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Package deleted successfully"}


@router.get("/{package_id}/stats", response_model=dict)
async def get_package_stats(package_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get real-time package statistics."""
    service = PackageService(db)
    stats = await service.get_package_stats(package_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Package not found")
    return stats
