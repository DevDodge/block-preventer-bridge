"""SQLAlchemy ORM models for all database tables."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, BigInteger, JSON, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Package(Base):
    __tablename__ = "packages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(20), default="active")
    distribution_mode = Column(String(20), default="round_robin")
    
    # Per-profile limits
    max_messages_per_hour = Column(Integer, default=20)
    max_messages_per_3hours = Column(Integer, default=45)
    max_messages_per_day = Column(Integer, default=120)
    max_concurrent_sends = Column(Integer, default=4)
    
    # Active hours (stored as string for compatibility)
    active_hours_start = Column(String(10), default="04:00:00")
    active_hours_end = Column(String(10), default="00:00:00")
    freeze_duration_hours = Column(Integer, default=4)
    
    # Rush hour settings
    rush_hour_threshold = Column(Integer, default=10)
    rush_hour_multiplier = Column(Float, default=2.0)
    quiet_mode_threshold = Column(Integer, default=5)
    quiet_mode_multiplier = Column(Float, default=0.5)
    
    # Auto-adjustment
    auto_adjust_limits = Column(Boolean, default=True)
    auto_adjust_interval_minutes = Column(Integer, default=360)  # Default: 6 hours
    auto_pause_on_failures = Column(Boolean, default=False)
    auto_pause_failure_threshold = Column(Integer, default=5)
    auto_pause_success_rate_threshold = Column(Float, default=50.0)
    alert_risk_score_threshold = Column(Integer, default=50)
    
    # Retry
    retry_failed_messages = Column(Boolean, default=True)
    retry_attempts = Column(Integer, default=3)
    retry_delay_seconds = Column(Integer, default=5)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    # Relationships
    profiles = relationship("Profile", back_populates="package", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="package", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="package", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    phone_number = Column(String(50))
    zentra_uuid = Column(String(64), nullable=False)
    zentra_api_token = Column(Text, nullable=False)
    
    status = Column(String(20), default="active")
    pause_reason = Column(Text)
    resume_at = Column(DateTime(timezone=True))
    
    # Weight system
    manual_priority = Column(Integer, default=5)
    weight_score = Column(Float, default=10.0)
    account_age_months = Column(Integer, default=0)
    
    # Per-profile rate limits (None = use package defaults)
    max_messages_per_hour = Column(Integer, nullable=True)  # None = use package limit
    max_messages_per_3hours = Column(Integer, nullable=True)
    max_messages_per_day = Column(Integer, nullable=True)
    
    # Per-profile auto-adjust (None = inherit from package)
    auto_adjust_limits = Column(Boolean, nullable=True)  # None = use package setting
    auto_adjust_interval_minutes = Column(Integer, nullable=True)  # None = use package default
    
    # Health
    health_score = Column(Integer, default=100)
    risk_score = Column(Integer, default=0)
    
    # Timestamps
    last_message_at = Column(DateTime(timezone=True))
    last_block_at = Column(DateTime(timezone=True))
    last_health_check_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    # Relationships
    package = relationship("Package", back_populates="profiles")
    statistics = relationship("ProfileStatistics", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    delivery_logs = relationship("DeliveryLog", back_populates="profile", cascade="all, delete-orphan", passive_deletes=True)
    alerts = relationship("Alert", back_populates="profile", cascade="all, delete-orphan", passive_deletes=True)
    queue_items = relationship("MessageQueue", back_populates="profile", cascade="all, delete-orphan", passive_deletes=True)


class ProfileStatistics(Base):
    __tablename__ = "profile_statistics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Sending stats
    messages_sent_total = Column(BigInteger, default=0)
    messages_sent_today = Column(Integer, default=0)
    messages_sent_hour = Column(Integer, default=0)
    messages_sent_3hours = Column(Integer, default=0)
    
    # Receiving stats
    messages_received_today = Column(Integer, default=0)
    
    # Failure stats
    failed_messages_today = Column(Integer, default=0)
    failed_messages_hour = Column(Integer, default=0)
    
    # Performance
    success_rate_24h = Column(Float, default=100.0)
    avg_response_time_ms = Column(Float, default=0.0)
    
    # Cooldown
    current_cooldown_seconds = Column(Integer, default=0)
    cooldown_expires_at = Column(DateTime(timezone=True))
    cooldown_mode = Column(String(20), default="normal")
    
    # Reset tracking
    last_hour_reset_at = Column(DateTime(timezone=True), default=utcnow)
    last_3hour_reset_at = Column(DateTime(timezone=True), default=utcnow)
    last_day_reset_at = Column(DateTime(timezone=True), default=utcnow)
    
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    # Relationships
    profile = relationship("Profile", back_populates="statistics")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"), nullable=False)
    
    message_mode = Column(String(10), nullable=False)
    message_type = Column(String(20), nullable=False)
    
    content = Column(Text, nullable=False)
    media_url = Column(Text)
    caption = Column(Text)
    
    recipients = Column(JSONB, default=[])
    
    status = Column(String(20), default="pending")
    scheduled_at = Column(DateTime(timezone=True))
    
    total_recipients = Column(Integer, default=0)
    processed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    
    distribution_result = Column(JSONB)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    # Relationships
    package = relationship("Package", back_populates="messages")
    delivery_logs = relationship("DeliveryLog", back_populates="message", cascade="all, delete-orphan")
    queue_items = relationship("MessageQueue", back_populates="message", cascade="all, delete-orphan")


class MessageQueue(Base):
    __tablename__ = "message_queue"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    recipient = Column(String(50), nullable=False)
    
    message_type = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    media_url = Column(Text)
    caption = Column(Text)
    
    status = Column(String(20), default="waiting")
    priority = Column(Integer, default=0)
    
    scheduled_send_at = Column(DateTime(timezone=True))
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    last_error = Column(Text)
    
    sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    # Relationships
    message = relationship("Message", back_populates="queue_items")
    profile = relationship("Profile", back_populates="queue_items")


class DeliveryLog(Base):
    __tablename__ = "delivery_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    recipient = Column(String(50), nullable=False)
    
    zentra_message_id = Column(String(100))
    message_mode = Column(String(10), nullable=False)
    
    status = Column(String(20), default="pending")
    attempt_count = Column(Integer, default=1)
    error_message = Column(Text)
    response_time_ms = Column(Integer)
    
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    # Relationships
    message = relationship("Message", back_populates="delivery_logs")
    profile = relationship("Profile", back_populates="delivery_logs")


class ConversationRouting(Base):
    __tablename__ = "conversation_routing"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    assigned_profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    
    last_interaction_at = Column(DateTime(timezone=True), default=utcnow)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    __table_args__ = (
        UniqueConstraint("package_id", "customer_phone", name="unique_customer_routing"),
    )
    
    # Relationships
    package = relationship("Package")
    profile = relationship("Profile")


class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"))
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="warning")
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    # Relationships
    package = relationship("Package", back_populates="alerts")
    profile = relationship("Profile", back_populates="alerts")


class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SystemSettings(Base):
    """Single-row global settings table."""
    __tablename__ = "global_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Cooldown
    global_cooldown_min = Column(Integer, default=300)
    global_cooldown_max = Column(Integer, default=900)
    max_daily_messages_global = Column(Integer, default=500)
    
    # Auto-pause
    auto_pause_enabled = Column(Boolean, default=True)
    auto_pause_failure_threshold = Column(Integer, default=5)
    auto_pause_success_rate_threshold = Column(Float, default=70.0)
    
    # Block detection
    block_detection_enabled = Column(Boolean, default=True)
    risk_alert_threshold = Column(Integer, default=60)
    auto_adjust_limits_global = Column(Boolean, default=True)
    
    # Active hours
    active_hours_start = Column(String(10), default="04:00")
    active_hours_end = Column(String(10), default="00:00")
    
    # Notifications
    webhook_url = Column(Text, default="")
    webhook_enabled = Column(Boolean, default=False)
    notification_email = Column(Text, default="")
    email_notifications_enabled = Column(Boolean, default=False)
    
    # UI preferences
    theme = Column(String(20), default="dark")
    timezone = Column(String(50), default="UTC")
    message_content_display = Column(String(10), default="hover")  # "hover" or "click"
    
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
