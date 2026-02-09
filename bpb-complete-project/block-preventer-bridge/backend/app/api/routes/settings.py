"""Settings API routes."""
import logging
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.services.settings_service import SettingsService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Settings"])


@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get all system settings."""
    service = SettingsService(db)
    return await service.get_settings()


@router.put("/settings")
async def update_settings(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """Update system settings."""
    service = SettingsService(db)
    return await service.update_settings(data)
