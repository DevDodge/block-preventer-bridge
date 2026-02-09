"""Pydantic schemas for Package operations."""
from datetime import datetime, time
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class PackageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    distribution_mode: str = Field(default="round_robin")
    max_messages_per_hour: int = Field(default=20, ge=1, le=1000)
    max_messages_per_3hours: int = Field(default=45, ge=1, le=3000)
    max_messages_per_day: int = Field(default=120, ge=1, le=10000)
    max_concurrent_sends: int = Field(default=4, ge=1, le=50)
    active_hours_start: str = Field(default="04:00:00")
    active_hours_end: str = Field(default="00:00:00")
    freeze_duration_hours: int = Field(default=4, ge=0, le=12)
    rush_hour_threshold: int = Field(default=10, ge=1, le=100)
    rush_hour_multiplier: float = Field(default=2.0, ge=1.0, le=5.0)
    quiet_mode_threshold: int = Field(default=5, ge=1, le=50)
    quiet_mode_multiplier: float = Field(default=0.5, ge=0.1, le=1.0)
    auto_adjust_limits: bool = True
    auto_pause_on_failures: bool = True
    auto_pause_failure_threshold: int = Field(default=5, ge=1, le=50)
    auto_pause_success_rate_threshold: float = Field(default=50.0, ge=0, le=100)
    alert_risk_score_threshold: int = Field(default=50, ge=0, le=100)
    retry_failed_messages: bool = True
    retry_attempts: int = Field(default=3, ge=1, le=10)
    retry_delay_seconds: int = Field(default=5, ge=1, le=300)


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    distribution_mode: Optional[str] = None
    max_messages_per_hour: Optional[int] = None
    max_messages_per_3hours: Optional[int] = None
    max_messages_per_day: Optional[int] = None
    max_concurrent_sends: Optional[int] = None
    active_hours_start: Optional[str] = None
    active_hours_end: Optional[str] = None
    freeze_duration_hours: Optional[int] = None
    rush_hour_threshold: Optional[int] = None
    rush_hour_multiplier: Optional[float] = None
    quiet_mode_threshold: Optional[int] = None
    quiet_mode_multiplier: Optional[float] = None
    auto_adjust_limits: Optional[bool] = None
    auto_pause_on_failures: Optional[bool] = None
    auto_pause_failure_threshold: Optional[int] = None
    auto_pause_success_rate_threshold: Optional[float] = None
    alert_risk_score_threshold: Optional[int] = None
    retry_failed_messages: Optional[bool] = None
    retry_attempts: Optional[int] = None
    retry_delay_seconds: Optional[int] = None


class ProfileInPackage(BaseModel):
    id: UUID
    name: str
    phone_number: Optional[str]
    status: str
    weight_score: float
    health_score: int
    risk_score: int
    manual_priority: int
    messages_sent_today: int = 0
    messages_sent_hour: int = 0
    messages_sent_3hours: int = 0
    success_rate_24h: float = 100.0
    cooldown_mode: str = "normal"
    current_cooldown_seconds: int = 0

    class Config:
        from_attributes = True


class PackageResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    distribution_mode: str
    max_messages_per_hour: int
    max_messages_per_3hours: int
    max_messages_per_day: int
    max_concurrent_sends: int
    active_hours_start: str
    active_hours_end: str
    freeze_duration_hours: int
    rush_hour_threshold: int
    rush_hour_multiplier: float
    quiet_mode_threshold: int
    quiet_mode_multiplier: float
    auto_adjust_limits: bool
    auto_pause_on_failures: bool
    auto_pause_failure_threshold: int
    auto_pause_success_rate_threshold: float
    alert_risk_score_threshold: int
    retry_failed_messages: bool
    retry_attempts: int
    retry_delay_seconds: int
    profiles: List[ProfileInPackage] = []
    total_profiles: int = 0
    active_profiles: int = 0
    queue_size: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PackageListResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    distribution_mode: str
    total_profiles: int = 0
    active_profiles: int = 0
    messages_today: int = 0
    queue_size: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class PackageStatsResponse(BaseModel):
    package_id: UUID
    package_name: str
    total_messages_today: int = 0
    total_messages_hour: int = 0
    total_sent: int = 0
    total_failed: int = 0
    total_pending: int = 0
    queue_size: int = 0
    queue_mode: str = "normal"
    cooldown_info: dict = {}
    profiles_stats: List[dict] = []
    two_hour_trend: dict = {}
