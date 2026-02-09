"""API routes for Profile management."""
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.services.profile_service import ProfileService
from app.schemas.profile import ProfileCreate, ProfileUpdate

router = APIRouter(prefix="/packages/{package_id}/profiles", tags=["Profiles"])


@router.get("", response_model=List[dict])
async def list_profiles(package_id: UUID, db: AsyncSession = Depends(get_db)):
    """List all profiles in a package with current stats."""
    service = ProfileService(db)
    profiles = await service.list_profiles(package_id)
    
    result = []
    for p in profiles:
        s = p.statistics
        result.append({
            "id": str(p.id),
            "package_id": str(p.package_id),
            "name": p.name,
            "phone_number": p.phone_number,
            "zentra_uuid": p.zentra_uuid,
            "status": p.status,
            "pause_reason": p.pause_reason,
            "resume_at": p.resume_at.isoformat() if p.resume_at else None,
            "manual_priority": p.manual_priority,
            "weight_score": p.weight_score,
            "account_age_months": p.account_age_months,
            "health_score": p.health_score,
            "risk_score": p.risk_score,
            "last_message_at": p.last_message_at.isoformat() if p.last_message_at else None,
            "last_block_at": p.last_block_at.isoformat() if p.last_block_at else None,
            "statistics": {
                "messages_sent_total": s.messages_sent_total if s else 0,
                "messages_sent_today": s.messages_sent_today if s else 0,
                "messages_sent_hour": s.messages_sent_hour if s else 0,
                "messages_sent_3hours": s.messages_sent_3hours if s else 0,
                "messages_received_today": s.messages_received_today if s else 0,
                "failed_messages_today": s.failed_messages_today if s else 0,
                "failed_messages_hour": s.failed_messages_hour if s else 0,
                "success_rate_24h": s.success_rate_24h if s else 100.0,
                "avg_response_time_ms": s.avg_response_time_ms if s else 0.0,
                "current_cooldown_seconds": s.current_cooldown_seconds if s else 0,
                "cooldown_mode": s.cooldown_mode if s else "normal",
                "cooldown_expires_at": s.cooldown_expires_at.isoformat() if s and s.cooldown_expires_at else None
            },
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None
        })
    
    return result


@router.post("", response_model=dict, status_code=201)
async def create_profile(package_id: UUID, data: ProfileCreate, db: AsyncSession = Depends(get_db)):
    """Add a new profile to a package."""
    service = ProfileService(db)
    try:
        profile = await service.create_profile(package_id, data.model_dump())
        return {
            "id": str(profile.id),
            "name": profile.name,
            "status": profile.status,
            "weight_score": profile.weight_score,
            "message": "Profile created successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{profile_id}", response_model=dict)
async def get_profile(package_id: UUID, profile_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get profile details with statistics."""
    service = ProfileService(db)
    profile = await service.get_profile(profile_id)
    if not profile or str(profile.package_id) != str(package_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    
    s = profile.statistics
    return {
        "id": str(profile.id),
        "package_id": str(profile.package_id),
        "name": profile.name,
        "phone_number": profile.phone_number,
        "zentra_uuid": profile.zentra_uuid,
        "status": profile.status,
        "pause_reason": profile.pause_reason,
        "manual_priority": profile.manual_priority,
        "weight_score": profile.weight_score,
        "account_age_months": profile.account_age_months,
        "health_score": profile.health_score,
        "risk_score": profile.risk_score,
        "statistics": {
            "messages_sent_total": s.messages_sent_total if s else 0,
            "messages_sent_today": s.messages_sent_today if s else 0,
            "messages_sent_hour": s.messages_sent_hour if s else 0,
            "messages_sent_3hours": s.messages_sent_3hours if s else 0,
            "messages_received_today": s.messages_received_today if s else 0,
            "failed_messages_today": s.failed_messages_today if s else 0,
            "success_rate_24h": s.success_rate_24h if s else 100.0,
            "avg_response_time_ms": s.avg_response_time_ms if s else 0.0,
            "current_cooldown_seconds": s.current_cooldown_seconds if s else 0,
            "cooldown_mode": s.cooldown_mode if s else "normal"
        }
    }


@router.put("/{profile_id}", response_model=dict)
async def update_profile(package_id: UUID, profile_id: UUID, data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    """Update a profile."""
    service = ProfileService(db)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    profile = await service.update_profile(profile_id, update_data)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"id": str(profile.id), "message": "Profile updated successfully"}


@router.delete("/{profile_id}")
async def delete_profile(package_id: UUID, profile_id: UUID, db: AsyncSession = Depends(get_db)):
    """Remove a profile from a package."""
    service = ProfileService(db)
    deleted = await service.delete_profile(profile_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile deleted successfully"}


@router.get("/{profile_id}/health", response_model=dict)
async def get_profile_health(package_id: UUID, profile_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get comprehensive health report for a profile."""
    service = ProfileService(db)
    health = await service.get_health(profile_id)
    if not health:
        raise HTTPException(status_code=404, detail="Profile not found")
    return health


@router.patch("/{profile_id}/status", response_model=dict)
async def toggle_profile_status(package_id: UUID, profile_id: UUID, status: str, db: AsyncSession = Depends(get_db)):
    """Toggle profile active/inactive/paused status."""
    valid_statuses = ["active", "inactive", "paused"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    
    service = ProfileService(db)
    profile = await service.toggle_status(profile_id, status)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"id": str(profile.id), "status": profile.status, "message": f"Profile status changed to {status}"}
