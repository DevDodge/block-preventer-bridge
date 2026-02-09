"""Pydantic schemas for Profile operations."""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone_number: Optional[str] = None
    zentra_uuid: str = Field(..., min_length=1)
    zentra_api_token: str = Field(..., min_length=1)
    manual_priority: int = Field(default=5, ge=1, le=10)
    account_age_months: int = Field(default=0, ge=0)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    zentra_uuid: Optional[str] = None
    zentra_api_token: Optional[str] = None
    manual_priority: Optional[int] = Field(default=None, ge=1, le=10)
    account_age_months: Optional[int] = Field(default=None, ge=0)
    status: Optional[str] = None


class ProfileStatisticsResponse(BaseModel):
    messages_sent_total: int = 0
    messages_sent_today: int = 0
    messages_sent_hour: int = 0
    messages_sent_3hours: int = 0
    messages_received_today: int = 0
    failed_messages_today: int = 0
    failed_messages_hour: int = 0
    success_rate_24h: float = 100.0
    avg_response_time_ms: float = 0.0
    current_cooldown_seconds: int = 0
    cooldown_mode: str = "normal"
    cooldown_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WeightBreakdown(BaseModel):
    base_weight: float = 10.0
    account_age_bonus: float = 0.0
    usage_penalty: float = 0.0
    success_bonus: float = 0.0
    failure_penalty: float = 0.0
    recovery_bonus: float = 0.0
    manual_priority_bonus: float = 0.0
    total_weight: float = 10.0


class RiskBreakdown(BaseModel):
    duplicate_message_penalty: int = 0
    too_fast_penalty: int = 0
    burst_penalty: int = 0
    no_engagement_penalty: int = 0
    new_recipients_penalty: int = 0
    total_risk: int = 0
    risk_level: str = "low"


class ProfileResponse(BaseModel):
    id: UUID
    package_id: UUID
    name: str
    phone_number: Optional[str]
    zentra_uuid: str
    status: str
    pause_reason: Optional[str]
    resume_at: Optional[datetime]
    manual_priority: int
    weight_score: float
    account_age_months: int
    health_score: int
    risk_score: int
    last_message_at: Optional[datetime]
    last_block_at: Optional[datetime]
    statistics: Optional[ProfileStatisticsResponse] = None
    weight_breakdown: Optional[WeightBreakdown] = None
    risk_breakdown: Optional[RiskBreakdown] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfileHealthResponse(BaseModel):
    profile_id: UUID
    profile_name: str
    status: str
    health_score: int
    risk_score: int
    risk_level: str
    weight_score: float
    weight_breakdown: WeightBreakdown
    risk_breakdown: RiskBreakdown
    statistics: ProfileStatisticsResponse
    limits_usage: dict = {}
    recommendations: list = []
