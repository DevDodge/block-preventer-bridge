"""Whats Guard - FastAPI Application Entry Point."""
import asyncio
import logging
from sqlalchemy import text
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.api.routes.packages import router as packages_router
from app.api.routes.profiles import router as profiles_router
from app.api.routes.messages import router as messages_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.settings import router as settings_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Background task handle
_background_task = None


async def background_processor():
    """
    Background task that runs periodically to:
    1. Process message queue items
    2. Check for block indicators
    3. Auto-resume paused profiles
    4. Process scheduled messages
    5. Auto-adjust rate limits
    6. Reset hourly/daily counters
    """
    from app.models.database import async_session_factory
    
    while True:
        try:
            async with async_session_factory() as db:
                try:
                    # 1. Process message queue
                    from app.services.message_service import MessageService
                    msg_service = MessageService(db)
                    await msg_service.process_queue()
                    
                    # 2. Process scheduled messages
                    from app.services.scheduling_service import SchedulingService
                    sched_service = SchedulingService(db)
                    await sched_service.process_scheduled_messages()
                    
                    # 3. Auto-resume paused profiles
                    from app.services.block_detection_service import BlockDetectionService
                    block_service = BlockDetectionService(db)
                    resumed = await block_service.auto_resume_profiles()
                    if resumed > 0:
                        logger.info(f"Auto-resumed {resumed} profiles")
                    
                    # 4. Block detection check (every cycle for active profiles)
                    from app.models.models import Package
                    from sqlalchemy import select
                    pkg_result = await db.execute(
                        select(Package).where(Package.status == "active")
                    )
                    packages = pkg_result.scalars().all()
                    for pkg in packages:
                        results = await block_service.check_all_profiles(pkg.id)
                        blocked = [r for r in results if r.get("blocked")]
                        if blocked:
                            logger.warning(f"Package {pkg.name}: {len(blocked)} profiles blocked")
                    
                    # 5. Auto-adjust limits (every cycle)
                    from app.services.auto_adjust_service import AutoAdjustService
                    for pkg in packages:
                        adjust_service = AutoAdjustService(db)
                        await adjust_service.evaluate_and_adjust(pkg)
                    
                    await db.commit()
                except Exception as e:
                    await db.rollback()
                    logger.error(f"Background processor error: {e}")
        except Exception as e:
            logger.error(f"Background processor session error: {e}")
        
        # Run every 10 seconds for faster message processing
        await asyncio.sleep(10)


async def stats_reset_processor():
    """
    Background task that resets hourly/3-hour/daily counters.
    Runs every 5 minutes to check if resets are needed.
    """
    from app.models.database import async_session_factory
    from app.models.models import ProfileStatistics
    from sqlalchemy import select
    from datetime import datetime, timezone, timedelta
    
    while True:
        try:
            async with async_session_factory() as db:
                try:
                    now = datetime.now(timezone.utc)
                    result = await db.execute(select(ProfileStatistics))
                    all_stats = result.scalars().all()
                    
                    for stats in all_stats:
                        # Reset hourly counters
                        if stats.last_hour_reset_at and (now - stats.last_hour_reset_at) >= timedelta(hours=1):
                            stats.messages_sent_hour = 0
                            stats.failed_messages_hour = 0
                            stats.last_hour_reset_at = now
                        
                        # Reset 3-hour counters
                        if stats.last_3hour_reset_at and (now - stats.last_3hour_reset_at) >= timedelta(hours=3):
                            stats.messages_sent_3hours = 0
                            stats.last_3hour_reset_at = now
                        
                        # Reset daily counters
                        if stats.last_day_reset_at and (now - stats.last_day_reset_at) >= timedelta(hours=24):
                            stats.messages_sent_today = 0
                            stats.messages_received_today = 0
                            stats.failed_messages_today = 0
                            stats.last_day_reset_at = now
                    
                    await db.commit()
                except Exception as e:
                    await db.rollback()
                    logger.error(f"Stats reset error: {e}")
        except Exception as e:
            logger.error(f"Stats reset session error: {e}")
        
        # Run every 5 minutes
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    global _background_task
    logger.info("Starting Whats Guard...")
    logger.info(f"Database: {settings.DATABASE_URL[:50]}...")
    
    # Create database tables if needed
    from app.models.database import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created")
    
    # Add new columns to existing tables (create_all doesn't add columns to existing tables)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS auto_adjust_interval_minutes INTEGER DEFAULT 360")
            )
        logger.info("Database migration: auto_adjust_interval_minutes column verified")
    except Exception as e:
        logger.warning(f"Could not add auto_adjust_interval_minutes column (may already exist or need admin): {e}")
    
    # Start background tasks
    _background_task = asyncio.create_task(background_processor())
    _stats_reset_task = asyncio.create_task(stats_reset_processor())
    logger.info("Background processors started")
    
    yield
    
    # Shutdown
    if _background_task:
        _background_task.cancel()
    if _stats_reset_task:
        _stats_reset_task.cancel()
    logger.info("Shutting down Whats Guard...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart message distribution system to prevent WhatsApp blocking",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(packages_router, prefix="/api/v1")
app.include_router(profiles_router, prefix="/api/v1")
app.include_router(messages_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "background_processor": "running" if _background_task and not _background_task.done() else "stopped"
    }
