# WhatsApp Spreader - Complete Implementation Plan

A message distribution system that spreads WhatsApp messages across multiple profiles to prevent blocking and ensure reliable delivery. Supports **Open Chat** (proactive) and **Reply Chat** (reactive) messaging modes.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY                                    │
│    /api/v1/packages/{id}/messages/open   (Open Chat - with limits)      │
│    /api/v1/packages/{id}/messages/reply  (Reply Chat - immediate)       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │    OPEN CHAT        │         │    REPLY CHAT       │
        │  ─────────────────  │         │  ─────────────────  │
        │  • Rate Limited     │         │  • NO Limits        │
        │  • Queued           │         │  • Immediate        │
        │  • Scheduled        │         │  • Sticky Routing   │
        │  • Distributed      │         │  • Same Profile     │
        └─────────────────────┘         └─────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌─────────────────────────────────────────────────────┐
        │              DISTRIBUTION ENGINE                     │
        │  Round-Robin | Random | Weighted | Priority | Smart  │
        └─────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  Profile A   │ │  Profile B   │ │  Profile N   │
        │  UUID: xxx   │ │  UUID: yyy   │ │  UUID: zzz   │
        │  API Key: X  │ │  API Key: Y  │ │  API Key: Z  │
        └──────────────┘ └──────────────┘ └──────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │              ZENTRA API                              │
        │  Text | Image | Voice | Document | Check WhatsApp    │
        └─────────────────────────────────────────────────────┘
```

---

## Message Modes

### 1. Reply Chat (Immediate Response)
- **Behavior**: NO delays, NO queuing, NO rate limits
- **Routing**: Sticky - same profile that received the message replies
- **Use Case**: Customer support, chatbot responses
- **API**: `POST /api/v1/packages/{id}/messages/reply`

### 2. Open Chat (Proactive Messaging)
- **Behavior**: Rate limited, queued, can be scheduled
- **Routing**: Distributed across profiles using selected algorithm
- **Use Case**: Marketing, order confirmations, broadcasts
- **API**: `POST /api/v1/packages/{id}/messages/open`
- **Limits Shown in UI**: All hourly/daily limits visible in real-time

---

## Database Schema

```sql
-- Packages Table
CREATE TABLE packages (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    distribution_mode ENUM('round_robin', 'sequential', 'random', 'weighted', 'smart') DEFAULT 'round_robin',
    max_messages_per_profile_per_hour INT DEFAULT 50,
    max_messages_per_profile_per_day INT DEFAULT 500,
    cooldown_seconds INT DEFAULT 2,
    active_hours_start TIME DEFAULT '08:00:00',
    active_hours_end TIME DEFAULT '22:00:00',
    retry_failed_messages BOOLEAN DEFAULT TRUE,
    retry_attempts INT DEFAULT 3,
    retry_delay_ms INT DEFAULT 5000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Profiles Table
CREATE TABLE profiles (
    id VARCHAR(36) PRIMARY KEY,
    package_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    zentra_uuid VARCHAR(64) NOT NULL,
    zentra_api_token_encrypted TEXT NOT NULL,
    status ENUM('active', 'inactive', 'blocked', 'cooldown') DEFAULT 'active',
    priority INT DEFAULT 1,
    weight INT DEFAULT 1,
    daily_message_limit INT DEFAULT 500,
    hourly_message_count INT DEFAULT 0,
    daily_message_count INT DEFAULT 0,
    last_message_at TIMESTAMP NULL,
    last_reset_at TIMESTAMP NULL,
    health_score INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
    INDEX idx_package_status (package_id, status)
);

-- Messages Table
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    package_id VARCHAR(36) NOT NULL,
    message_mode ENUM('open', 'reply') NOT NULL,
    type ENUM('text', 'image', 'voice', 'document', 'video') NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    caption TEXT,
    recipients JSON NOT NULL,
    status ENUM('pending', 'queued', 'processing', 'completed', 'failed', 'scheduled') DEFAULT 'pending',
    scheduled_at TIMESTAMP NULL,
    waiting_strategy ENUM('immediate', 'queued', 'drip', 'smart') DEFAULT 'immediate',
    drip_interval_minutes INT DEFAULT NULL,
    total_recipients INT NOT NULL,
    processed_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id),
    INDEX idx_package_status (package_id, status),
    INDEX idx_scheduled (scheduled_at, status)
);

-- Delivery Logs Table
CREATE TABLE delivery_logs (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    profile_id VARCHAR(36) NOT NULL,
    recipient VARCHAR(50) NOT NULL,
    zentra_message_id VARCHAR(100),
    message_mode ENUM('open', 'reply') NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed', 'blocked') DEFAULT 'pending',
    attempt_count INT DEFAULT 1,
    error_message TEXT,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id),
    INDEX idx_message_status (message_id, status),
    INDEX idx_profile_status (profile_id, status),
    INDEX idx_recipient (recipient)
);

-- Conversation Routing (for Reply Chat sticky routing)
CREATE TABLE conversation_routing (
    id VARCHAR(36) PRIMARY KEY,
    package_id VARCHAR(36) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    assigned_profile_id VARCHAR(36) NOT NULL,
    last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_profile_id) REFERENCES profiles(id),
    UNIQUE KEY unique_customer (package_id, customer_phone)
);
```

---

## API Endpoints

### Package Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/packages` | List all packages with status |
| POST | `/api/v1/packages` | Create new package |
| GET | `/api/v1/packages/{id}` | Get package with profiles & limits |
| PUT | `/api/v1/packages/{id}` | Update package settings |
| DELETE | `/api/v1/packages/{id}` | Delete package (cascades) |
| GET | `/api/v1/packages/{id}/stats` | Get real-time usage stats |

### Profile Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/packages/{id}/profiles` | List profiles with current limits |
| POST | `/api/v1/packages/{id}/profiles` | Add profile to package |
| PUT | `/api/v1/packages/{id}/profiles/{pid}` | Update profile |
| DELETE | `/api/v1/packages/{id}/profiles/{pid}` | Remove profile |
| GET | `/api/v1/packages/{id}/profiles/{pid}/health` | Check profile health |
| PATCH | `/api/v1/packages/{id}/profiles/{pid}/status` | Toggle active/inactive |

### Message Sending

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/packages/{id}/messages/open` | Send Open Chat (with limits) |
| POST | `/api/v1/packages/{id}/messages/reply` | Send Reply Chat (immediate) |
| GET | `/api/v1/packages/{id}/messages/{mid}` | Get message status |
| GET | `/api/v1/packages/{id}/messages` | List messages with filters |
| POST | `/api/v1/validate-numbers` | Validate WhatsApp numbers |

---

## Request/Response Examples

### Send Open Chat Message
```http
POST /api/v1/packages/pkg_123/messages/open
Content-Type: application/json

{
  "type": "text",
  "text": "Hello! Special offer for you...",
  "recipients": ["201066183456", "201500515678", "201555123456"],
  "options": {
    "waiting_strategy": "drip",
    "drip_interval_minutes": 2,
    "schedule_at": null
  }
}
```

**Response:**
```json
{
  "message_id": "msg_abc123",
  "mode": "open",
  "status": "queued",
  "total_recipients": 3,
  "distribution": {
    "prof_1": ["201066183456"],
    "prof_2": ["201500515678"],
    "prof_3": ["201555123456"]
  },
  "estimated_completion": "2024-02-08T18:10:00Z",
  "limits_status": {
    "prof_1": {"hourly": "45/50", "daily": "320/500", "status": "active"},
    "prof_2": {"hourly": "12/50", "daily": "89/500", "status": "active"},
    "prof_3": {"hourly": "50/50", "daily": "500/500", "status": "limit_reached"}
  }
}
```

### Send Reply Chat Message
```http
POST /api/v1/packages/pkg_123/messages/reply
Content-Type: application/json

{
  "type": "text",
  "text": "Your order #12345 will arrive tomorrow!",
  "recipient": "201066183456",
  "conversation_id": "conv_xyz789"
}
```

**Response:**
```json
{
  "message_id": "msg_def456",
  "mode": "reply",
  "status": "sent",
  "sent_at": "2024-02-08T18:45:12.123Z",
  "profile_used": "prof_1",
  "delivery_time_ms": 245,
  "note": "Reply messages bypass all rate limits"
}
```

---

## Project Structure

```
whatsapp_spreader/
├── src/
│   ├── main.py                    # FastAPI entry point
│   │
│   ├── models/                    # SQLAlchemy models
│   │   ├── package.py
│   │   ├── profile.py
│   │   ├── message.py
│   │   ├── delivery_log.py
│   │   └── conversation_routing.py
│   │
│   ├── schemas/                   # Pydantic schemas
│   │   ├── package.py
│   │   ├── profile.py
│   │   └── message.py
│   │
│   ├── api/routes/                # API endpoints
│   │   ├── packages.py
│   │   ├── profiles.py
│   │   └── messages.py
│   │
│   ├── services/                  # Business logic
│   │   ├── package_service.py
│   │   ├── profile_service.py
│   │   ├── message_service.py
│   │   ├── distribution_service.py    # Distribution algorithms
│   │   └── reply_router.py            # Sticky routing for Reply Chat
│   │
│   ├── integrations/
│   │   └── zentra/                # Zentra API client
│   │       ├── client.py
│   │       └── endpoints.py
│   │
│   ├── utils/
│   │   ├── encryption.py          # Token encryption
│   │   ├── rate_limiter.py        # Rate limiting logic
│   │   ├── validators.py          # Phone validation
│   │   └── queue.py               # Message queue (Open Chat)
│   │
│   └── config/
│       └── settings.py
│
├── tests/
├── migrations/
├── requirements.txt
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## Implementation Phases

### Phase 1: Core Infrastructure ⏱️ Week 1
- [ ] Project setup (FastAPI + PostgreSQL)
- [ ] Database models & migrations
- [ ] Package & Profile CRUD APIs
- [ ] API token encryption
- [ ] Basic authentication

### Phase 2: Message System ⏱️ Week 2
- [ ] Zentra API client wrapper
- [ ] Open Chat endpoint with distribution
- [ ] Reply Chat endpoint with sticky routing
- [ ] Rate limiting per profile
- [ ] Retry logic with exponential backoff

### Phase 3: Distribution & Limits ⏱️ Week 3
- [ ] Round-robin, random, weighted distribution
- [ ] Smart distribution (health-aware)
- [ ] Hourly/daily limit tracking
- [ ] Real-time limits status in API responses
- [ ] Waiting strategies (queued, drip, scheduled)

### Phase 4: UI Dashboard ⏱️ Week 4
- [ ] Package management UI
- [ ] Profile management with health indicators
- [ ] Real-time limits display
- [ ] Message sending interface
- [ ] Delivery logs viewer

---

## Key Differentiators

| Feature | Open Chat | Reply Chat |
|---------|-----------|------------|
| Rate Limits | ✅ Enforced | ❌ Bypassed |
| Queuing | ✅ Supported | ❌ Immediate |
| Scheduling | ✅ Supported | ❌ N/A |
| Distribution | ✅ Across profiles | ❌ Sticky routing |
| Cooldown | ✅ Configurable | ❌ None |
| Limits in UI | ✅ Real-time | ✅ For monitoring |

---

## Security Considerations

1. **Token Encryption**: All Zentra API tokens encrypted at rest
2. **Rate Limiting**: Prevent API abuse with per-client limits
3. **Input Validation**: Phone number format, message length
4. **Authentication**: API key or JWT required for all endpoints
5. **Audit Logging**: Track all message sending activity
