-- Block Preventer Bridge - Complete Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PACKAGES TABLE
-- ============================================================
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    distribution_mode VARCHAR(20) DEFAULT 'round_robin' CHECK (distribution_mode IN ('round_robin', 'random', 'weighted', 'smart')),
    
    -- Per-profile limits
    max_messages_per_hour INT DEFAULT 20,
    max_messages_per_3hours INT DEFAULT 45,
    max_messages_per_day INT DEFAULT 120,
    max_concurrent_sends INT DEFAULT 4,
    
    -- Active hours
    active_hours_start TIME DEFAULT '04:00:00',
    active_hours_end TIME DEFAULT '00:00:00',
    freeze_duration_hours INT DEFAULT 4,
    
    -- Rush hour settings
    rush_hour_threshold INT DEFAULT 10,
    rush_hour_multiplier FLOAT DEFAULT 2.0,
    quiet_mode_threshold INT DEFAULT 5,
    quiet_mode_multiplier FLOAT DEFAULT 0.5,
    
    -- Auto-adjustment settings
    auto_adjust_limits BOOLEAN DEFAULT TRUE,
    auto_pause_on_failures BOOLEAN DEFAULT TRUE,
    auto_pause_failure_threshold INT DEFAULT 5,
    auto_pause_success_rate_threshold FLOAT DEFAULT 50.0,
    alert_risk_score_threshold INT DEFAULT 50,
    
    -- Retry settings
    retry_failed_messages BOOLEAN DEFAULT TRUE,
    retry_attempts INT DEFAULT 3,
    retry_delay_seconds INT DEFAULT 5,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    zentra_uuid VARCHAR(64) NOT NULL,
    zentra_api_token TEXT NOT NULL,
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'cooldown', 'paused', 'limit_reached')),
    pause_reason TEXT,
    resume_at TIMESTAMP WITH TIME ZONE,
    
    -- Weight system
    manual_priority INT DEFAULT 5 CHECK (manual_priority BETWEEN 1 AND 10),
    weight_score FLOAT DEFAULT 10.0,
    account_age_months INT DEFAULT 0,
    
    -- Health
    health_score INT DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    risk_score INT DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    
    -- Timestamps
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_block_at TIMESTAMP WITH TIME ZONE,
    last_health_check_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_package_status ON profiles(package_id, status);

-- ============================================================
-- PROFILE STATISTICS TABLE (rolling stats)
-- ============================================================
CREATE TABLE profile_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Sending stats
    messages_sent_total BIGINT DEFAULT 0,
    messages_sent_today INT DEFAULT 0,
    messages_sent_hour INT DEFAULT 0,
    messages_sent_3hours INT DEFAULT 0,
    
    -- Receiving stats
    messages_received_today INT DEFAULT 0,
    
    -- Failure stats
    failed_messages_today INT DEFAULT 0,
    failed_messages_hour INT DEFAULT 0,
    
    -- Performance
    success_rate_24h FLOAT DEFAULT 100.0,
    avg_response_time_ms FLOAT DEFAULT 0.0,
    
    -- Cooldown
    current_cooldown_seconds INT DEFAULT 0,
    cooldown_expires_at TIMESTAMP WITH TIME ZONE,
    cooldown_mode VARCHAR(20) DEFAULT 'normal' CHECK (cooldown_mode IN ('quiet', 'normal', 'rush_hour', 'critical')),
    
    -- Reset tracking
    last_hour_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_3hour_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_day_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(profile_id)
);

CREATE INDEX idx_profile_stats_profile ON profile_statistics(profile_id);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    
    message_mode VARCHAR(10) NOT NULL CHECK (message_mode IN ('open', 'reply')),
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'image', 'voice', 'document', 'video')),
    
    content TEXT NOT NULL,
    media_url TEXT,
    caption TEXT,
    
    recipients JSONB NOT NULL DEFAULT '[]',
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'scheduled', 'cancelled')),
    
    scheduled_at TIMESTAMP WITH TIME ZONE,
    
    total_recipients INT NOT NULL DEFAULT 0,
    processed_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    
    distribution_result JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_package_status ON messages(package_id, status);
CREATE INDEX idx_messages_scheduled ON messages(scheduled_at, status);

-- ============================================================
-- MESSAGE QUEUE TABLE (for Open Chat queuing)
-- ============================================================
CREATE TABLE message_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient VARCHAR(50) NOT NULL,
    
    message_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    caption TEXT,
    
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'processing', 'sent', 'failed', 'cancelled')),
    priority INT DEFAULT 0,
    
    scheduled_send_at TIMESTAMP WITH TIME ZONE,
    attempt_count INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_error TEXT,
    
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_queue_status_scheduled ON message_queue(status, scheduled_send_at);
CREATE INDEX idx_queue_profile ON message_queue(profile_id, status);

-- ============================================================
-- DELIVERY LOGS TABLE
-- ============================================================
CREATE TABLE delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient VARCHAR(50) NOT NULL,
    
    zentra_message_id VARCHAR(100),
    message_mode VARCHAR(10) NOT NULL CHECK (message_mode IN ('open', 'reply')),
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'blocked')),
    attempt_count INT DEFAULT 1,
    error_message TEXT,
    response_time_ms INT,
    
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_delivery_message_status ON delivery_logs(message_id, status);
CREATE INDEX idx_delivery_profile_status ON delivery_logs(profile_id, status);
CREATE INDEX idx_delivery_recipient ON delivery_logs(recipient);
CREATE INDEX idx_delivery_created ON delivery_logs(created_at);

-- ============================================================
-- CONVERSATION ROUTING TABLE (sticky routing for Reply Chat)
-- ============================================================
CREATE TABLE conversation_routing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    customer_phone VARCHAR(50) NOT NULL,
    assigned_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(package_id, customer_phone)
);

CREATE INDEX idx_routing_lookup ON conversation_routing(package_id, customer_phone);

-- ============================================================
-- ALERTS TABLE
-- ============================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('block_detected', 'high_risk', 'low_success_rate', 'limit_reached', 'auto_paused', 'health_warning', 'system')),
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    is_read BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_unread ON alerts(is_read, created_at);

-- ============================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
    ('health_check_interval_minutes', '30', 'How often to check profile health via Zentra'),
    ('stats_reset_interval_minutes', '60', 'How often to reset hourly stats'),
    ('default_cooldown_min_seconds', '300', 'Minimum cooldown between messages (5 min)'),
    ('default_cooldown_max_seconds', '900', 'Maximum cooldown between messages (15 min)'),
    ('queue_processor_interval_seconds', '30', 'How often to check queue for pending messages');
