# Whats Guard — Completion Plan & Approval Report

**Date:** February 9, 2026  
**Branch:** `feature/complete-project` (to be created)  
**Purpose:** This document is the definitive reference for all remaining work. Every item listed below will be implemented only after your approval. No code changes will be made until you confirm.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Is Already Done (Backend)](#2-what-is-already-done-backend)
3. [What Is Already Done (Frontend)](#3-what-is-already-done-frontend)
4. [Incomplete Backend Features — Detailed Breakdown](#4-incomplete-backend-features--detailed-breakdown)
5. [Incomplete Frontend Features — Detailed Breakdown](#5-incomplete-frontend-features--detailed-breakdown)
6. [Implementation Order (Backend → Frontend pairs)](#6-implementation-order-backend--frontend-pairs)
7. [Files That Will Be Modified or Created](#7-files-that-will-be-modified-or-created)
8. [What Will NOT Be Changed](#8-what-will-not-be-changed)

---

## 1. Executive Summary

The project has a **solid foundation**: the FastAPI backend is structured with proper services, models, and routes; the React frontend has a polished dark-themed UI with 8 pages. However, the **intelligent core** of the system — the features that make it a "Block Preventer" rather than a simple message sender — are either placeholder stubs or entirely missing.

**Key finding:** The uploaded analysis report (`ProjectAnalysisReport_WhatsAppGuard.md`) identified many gaps. Since that report was written, some backend services have been partially filled in (e.g., `block_detection_service.py`, `risk_pattern_service.py`, `auto_adjust_service.py` now contain logic), and the `main.py` background processor now calls them. However, the **critical integration points** — where these services connect to the actual message-sending workflow and the frontend — remain broken or missing.

### Summary Counts

| Area | Fully Done | Partially Done | Not Done |
|------|-----------|---------------|----------|
| Backend Services (11 total) | 5 | 4 | 2 |
| Backend API Routes | 3 route files | 0 | 2 missing route files (alerts, settings) |
| Frontend Pages (8 total) | 3 | 4 | 1 |
| Frontend-Backend Connections | 4 | 2 | 5 |

---

## 2. What Is Already Done (Backend)

These backend components are **complete and functional**:

1. **Core Infrastructure** — FastAPI app with CORS, lifespan, background tasks (`main.py`)
2. **Database Models** — All 8 SQLAlchemy models: `Package`, `Profile`, `ProfileStatistics`, `Message`, `MessageQueue`, `DeliveryLog`, `ConversationRouting`, `ScheduledMessage` (`models.py`)
3. **Database Connection** — Async SQLAlchemy engine with session factory (`database.py`)
4. **Package Service** — Full CRUD + stats + queue info (`package_service.py`)
5. **Profile Service** — Full CRUD + toggle status + health report + weight recalculation (`profile_service.py`)
6. **Zentra Client** — Complete API client for text, image, voice, document, video, health check (`zentra/client.py`)
7. **Pydantic Schemas** — Complete request/response schemas for packages, profiles, messages
8. **Package Routes** — Full CRUD + stats endpoints (`routes/packages.py`)
9. **Profile Routes** — Full CRUD + health + status toggle (`routes/profiles.py`)
10. **Message Routes** — Send open, send reply, list, get, queue status, analytics, block-check, risk-patterns (`routes/messages.py`)
11. **Background Processor** — Runs every 30s: processes queue, scheduled messages, auto-resume, block detection, auto-adjust (`main.py`)
12. **Stats Reset Processor** — Runs every 5min: resets hourly/3h/daily counters (`main.py`)
13. **Weight Service** — Calculates weight score based on health, success rate, account age, priority (`weight_service.py`)
14. **Cooldown Service** — Dynamic cooldown calculation with rush-hour/quiet-mode logic, queue status (`cooldown_service.py`)
15. **Risk Pattern Service** — Analyzes sending speed, burst activity, failure rate, duplicate messages (`risk_pattern_service.py`)
16. **Block Detection Service** — Checks for block indicators via failure rate, consecutive failures, response patterns (`block_detection_service.py`)
17. **Auto-Adjust Service** — Evaluates package performance and adjusts limits up/down (`auto_adjust_service.py`)

---

## 3. What Is Already Done (Frontend)

These frontend components are **complete and functional**:

1. **DashboardLayout** — Sidebar navigation with collapsible menu, alert badge polling, system status indicator
2. **Home Page** — Hero banner, 4 metric cards (packages, profiles, messages, queue), package list, system health, recent alerts
3. **Packages Page** — Full CRUD with create/edit dialogs, search, grid cards with stats, dropdown actions
4. **PackageDetail Page** — Tabbed view with profiles list and limits/settings, add profile dialog, health viewer, toggle status, delete
5. **Profiles Page** — Cross-package profile aggregation, search/filter, table with health/risk/weight/usage columns
6. **Messages Page** — Package selector, send open/reply dialogs, message list with status icons, queue status bar, status filter
7. **Analytics Page** — Package selector, time range picker, 4 summary cards, area chart, pie chart, hourly bar chart (using recharts)
8. **Alerts Page** — Alert list with severity icons/badges, mark-as-read, filter (all/unread), empty state
9. **Settings Page** — 3 tabs (Zentra API, Notifications, System), form fields, connection status display
10. **API Client** — Complete `api.ts` with methods for packages, profiles, messages, alerts, system
11. **Hooks** — `useApi` and `usePolling` custom hooks for data fetching

---

## 4. Incomplete Backend Features — Detailed Breakdown

### 4.1. MISSING: Alerts API Routes (HIGH PRIORITY)

**Current State:** The frontend `api.ts` calls `/api/v1/alerts`, `/api/v1/alerts/count`, `/api/v1/alerts/{id}/read`, `/api/v1/alerts/read-all` — but **no alerts route file exists** in the backend. There is no `routes/alerts.py` and no `AlertService`. The `main.py` does not include an alerts router.

**What needs to be done:**
- Create `app/models/models.py` — Add `Alert` model (id, package_id, title, message, severity, alert_type, read_at, created_at)
- Create `app/services/alert_service.py` — CRUD for alerts, count unread, mark read, mark all read
- Create `app/api/routes/alerts.py` — GET /alerts, GET /alerts/count, PATCH /alerts/{id}/read, PATCH /alerts/read-all
- Register the alerts router in `main.py`
- Integrate alert creation into `block_detection_service.py` (when block detected → create alert), `auto_adjust_service.py` (when limits adjusted → create alert), and `message_service.py` (when failures exceed threshold → create alert)

### 4.2. MISSING: Settings API Routes (HIGH PRIORITY)

**Current State:** The frontend `api.ts` calls `/api/v1/settings` (GET and PUT) — but **no settings route file exists** in the backend. The `settings_service.py` exists but is a stub. The Settings page currently saves to `localStorage` only.

**What needs to be done:**
- Create `app/models/models.py` — Add `SystemSettings` model (id, key, value, updated_at) or a single-row settings table
- Complete `app/services/settings_service.py` — Get settings, update settings, with defaults
- Create `app/api/routes/settings.py` — GET /settings, PUT /settings
- Register the settings router in `main.py`
- Make the Settings page save to the database instead of localStorage

### 4.3. INCOMPLETE: Smart & Weighted Distribution (HIGH PRIORITY)

**Current State:** `distribution_service.py` has `smart()` and `weighted()` methods, but they **fall back to `round_robin()`**. The `WeightService` calculates weights but the distribution service doesn't use them.

**What needs to be done:**
- Implement `smart()` in `distribution_service.py` — Select profile based on: weight score, current cooldown state, hourly/daily usage ratio, health score, and risk score. The profile with the best composite score that is not in cooldown and has not exceeded limits should be selected.
- Implement `weighted()` in `distribution_service.py` — Use weight scores as probability weights for random selection among eligible profiles.
- Ensure `message_service.py` passes the correct distribution mode to the distribution service.

### 4.4. INCOMPLETE: Dynamic Cooldown Integration (MEDIUM PRIORITY)

**Current State:** `CooldownService` correctly calculates dynamic cooldowns with rush-hour/quiet-mode logic. However, `MessageService.process_queue()` does not use the dynamic cooldown value — it uses a fixed `asyncio.sleep(estimated_cooldown)` instead of calling `CooldownService.calculate_cooldown()` for each profile before sending.

**What needs to be done:**
- In `message_service.py` `process_queue()`, before sending each message, call `CooldownService.calculate_cooldown(profile, package)` to get the dynamic cooldown.
- After sending, update `ProfileStatistics.current_cooldown_seconds` and `cooldown_mode` with the calculated values.
- Respect the cooldown: do not send from a profile if its last send time + cooldown > now.

### 4.5. INCOMPLETE: Conversation Threading / Sticky Routing (MEDIUM PRIORITY)

**Current State:** `send_reply_chat()` in `message_service.py` looks up `ConversationRouting` to find the correct profile for a recipient. However, after a successful `send_open_chat()`, no `ConversationRouting` entry is created. This means the first open message doesn't establish a route, so subsequent replies can't find the profile.

**What needs to be done:**
- In `message_service.py` `send_open_chat()`, after successfully sending a message, create a `ConversationRouting` entry mapping (package_id, recipient_number) → profile_id.
- In `send_reply_chat()`, if no route exists, select a profile using the distribution service and then create the route.

### 4.6. INCOMPLETE: Message Scheduling & Drip Campaigns (LOW PRIORITY)

**Current State:** `scheduling_service.py` has `schedule_message()` and `process_scheduled_messages()` methods. The `process_scheduled_messages()` is called in the background processor. However, the API endpoint `POST /packages/{id}/messages/schedule` in `messages.py` calls the scheduling service but the drip campaign logic (distributing messages over a time window) is not implemented.

**What needs to be done:**
- Complete `scheduling_service.py` `schedule_drip_campaign()` — Given a list of recipients and a time window, create individual `ScheduledMessage` entries spread across the window.
- Add a `POST /packages/{id}/messages/drip` endpoint for drip campaigns.
- The frontend already has `messagesApi.schedule()` and `messagesApi.listScheduled()` — these need to be connected.

### 4.7. INCOMPLETE: Webhook Notifications (LOW PRIORITY)

**Current State:** `webhook_service.py` exists but is a stub with placeholder methods.

**What needs to be done:**
- Implement `webhook_service.py` — `send_webhook(url, event_type, payload)` using `aiohttp`.
- Integrate webhook calls into: message delivery status changes, block detection events, profile freeze events.
- Read the webhook URL from the `SystemSettings` table (once settings API is done).

### 4.8. INCOMPLETE: Analytics Backend Endpoint (HIGH PRIORITY)

**Current State:** The `GET /packages/{id}/analytics` endpoint exists in `messages.py` and returns data from `message_service.get_analytics()`. However, `get_analytics()` queries the `Message` table and returns basic counts. It does **not** return the `daily_breakdown`, `hourly_breakdown`, or `avg_delivery_time` fields that the frontend expects.

**What needs to be done:**
- Enhance `message_service.get_analytics()` to return:
  - `daily_breakdown`: Array of `{date, sent, delivered, failed}` for each day in the range
  - `hourly_breakdown`: Array of `{hour, messages}` for the 24 hours
  - `avg_delivery_time`: Average response time from `DeliveryLog`
  - `total_sent`, `delivered`, `sent`, `queued`, `failed` counts
- This will make the Analytics page display real data instead of random sample data.

---

## 5. Incomplete Frontend Features — Detailed Breakdown

### 5.1. Analytics Page — Uses Sample/Random Data (HIGH PRIORITY)

**Current State:** The Analytics page generates random data with `Math.random()` when no analytics data is returned from the backend. Even when data is returned, the `daily_breakdown` and `hourly_breakdown` fields are not provided by the backend.

**What needs to be done (after backend 4.8 is done):**
- Remove the random data generation fallbacks in `Analytics.tsx`.
- Display a proper "Select a package" or "No data available" state instead of fake charts.
- Connect the charts to the real `daily_breakdown` and `hourly_breakdown` data from the API.

### 5.2. Settings Page — Saves to localStorage Only (HIGH PRIORITY)

**Current State:** All three settings tabs (Zentra API, Notifications, System) save to `localStorage`. The `systemApi.getSettings()` and `systemApi.updateSettings()` methods exist in `api.ts` but are not used by the Settings page.

**What needs to be done (after backend 4.2 is done):**
- Load settings from the backend API on page mount using `systemApi.getSettings()`.
- Save settings to the backend using `systemApi.updateSettings()` instead of `localStorage`.
- Show loading states while fetching/saving.
- Add a "Test Connection" button that actually calls the backend health endpoint.

### 5.3. Alerts Page — Missing "Mark All Read" and "Delete" (MEDIUM PRIORITY)

**Current State:** The Alerts page has "Mark Read" per alert but no "Mark All Read" button and no delete functionality. The `alertsApi.markAllRead()` method exists in `api.ts` but is not used.

**What needs to be done (after backend 4.1 is done):**
- Add a "Mark All Read" button in the Alerts page header.
- Add a delete/dismiss button per alert.
- Add severity filter (critical/warning/info) in addition to the existing read/unread filter.
- Add package filter to show alerts for a specific package.

### 5.4. Messages Page — Missing Schedule & Drip UI (LOW PRIORITY)

**Current State:** The send message dialog only supports immediate sending. There are no UI controls for scheduling a message for later or creating a drip campaign.

**What needs to be done (after backend 4.6 is done):**
- Add a "Schedule" tab in the send message dialog with date/time picker.
- Add a "Drip Campaign" option with start time, end time, and recipient list.
- Add a "Scheduled Messages" tab in the Messages page showing pending scheduled messages with cancel buttons.
- Connect to `messagesApi.schedule()`, `messagesApi.listScheduled()`, `messagesApi.cancelScheduled()`.

### 5.5. PackageDetail Page — Missing Distribution Mode Selector (MEDIUM PRIORITY)

**Current State:** The PackageDetail page shows the current distribution mode as a badge but does not allow changing it from the detail view. The Limits & Settings tab shows rate limits but not the distribution mode selector.

**What needs to be done:**
- Add distribution mode selector (round_robin, random, smart, weighted) in the Limits & Settings tab.
- Show a visual indicator of which distribution strategy is active and what it means.

### 5.6. Profile Health Modal — Missing Detailed Breakdown (MEDIUM PRIORITY)

**Current State:** The health modal in PackageDetail shows basic health data but does not display the full breakdown returned by the `profilesApi.health()` endpoint (weight breakdown, risk breakdown, block indicators, recommendations, limits usage).

**What needs to be done:**
- Enhance the health modal to show:
  - Weight breakdown (base weight, health factor, success factor, age bonus, priority bonus)
  - Risk breakdown with individual pattern scores and recommendations
  - Block indicators list
  - Limits usage bars (hourly, 3-hour, daily)
  - Recommendations list

### 5.7. Home Dashboard — Alert Badge Shows Real Count (DONE - VERIFY)

**Current State:** The `DashboardLayout` component polls `alertsApi.count()` every 30 seconds and displays the unread count. However, since the alerts API route doesn't exist in the backend yet, this always fails silently and shows 0.

**What needs to be done:** Once the alerts backend route (4.1) is implemented, this will work automatically. No frontend changes needed.

### 5.8. Messages Page — Missing Pagination (LOW PRIORITY)

**Current State:** The messages list loads up to 50 messages with no pagination controls.

**What needs to be done:**
- Add pagination controls (previous/next or infinite scroll).
- Add `offset` parameter to the API call.

---

## 6. Implementation Order (Backend → Frontend pairs)

Each step completes a backend feature and then immediately connects it to the frontend, so you see progress after every step.

| Step | Backend Task | Frontend Task | Priority |
|------|-------------|---------------|----------|
| **1** | Create Alert model + AlertService + alerts routes + register in main.py | Connect Alerts page to real API; add Mark All Read, severity filter | HIGH |
| **2** | Create SystemSettings model + complete SettingsService + settings routes | Connect Settings page to backend API instead of localStorage | HIGH |
| **3** | Implement smart() and weighted() distribution in distribution_service.py | Add distribution mode selector in PackageDetail Limits tab | HIGH |
| **4** | Enhance message_service.get_analytics() with daily/hourly breakdowns | Remove random data from Analytics page; connect to real API data | HIGH |
| **5** | Integrate dynamic cooldown into message_service.process_queue() | No frontend change needed (backend-only improvement) | MEDIUM |
| **6** | Create ConversationRouting entries after open messages | No frontend change needed (backend-only improvement) | MEDIUM |
| **7** | Enhance profile health modal data | Expand health modal with weight/risk breakdowns, indicators, recommendations | MEDIUM |
| **8** | Complete scheduling_service drip campaign logic + API endpoint | Add Schedule/Drip tabs in send message dialog + scheduled messages list | LOW |
| **9** | Implement webhook_service.py with aiohttp | Add webhook test button in Settings page | LOW |
| **10** | Integrate alert creation into block detection, auto-adjust, message failures | No frontend change (alerts auto-appear) | LOW |
| **11** | Add message pagination to backend | Add pagination controls to Messages page | LOW |

---

## 7. Files That Will Be Modified or Created

### New Files to Create
- `backend/app/models/alert_model.py` — Alert SQLAlchemy model (or add to existing models.py)
- `backend/app/models/settings_model.py` — SystemSettings model (or add to existing models.py)
- `backend/app/services/alert_service.py` — Alert CRUD service
- `backend/app/api/routes/alerts.py` — Alerts API endpoints
- `backend/app/api/routes/settings.py` — Settings API endpoints

### Existing Files to Modify
- `backend/app/models/models.py` — Add Alert and SystemSettings models
- `backend/app/main.py` — Register alerts and settings routers
- `backend/app/services/distribution_service.py` — Implement smart() and weighted()
- `backend/app/services/message_service.py` — Integrate dynamic cooldown, create ConversationRouting after open, enhance analytics
- `backend/app/services/settings_service.py` — Complete implementation
- `backend/app/services/webhook_service.py` — Complete implementation
- `backend/app/services/scheduling_service.py` — Add drip campaign logic
- `backend/app/services/block_detection_service.py` — Create alerts on block detection
- `backend/app/services/auto_adjust_service.py` — Create alerts on limit adjustment
- `frontend/client/src/pages/Analytics.tsx` — Remove random data, connect to real API
- `frontend/client/src/pages/Settings.tsx` — Save to backend instead of localStorage
- `frontend/client/src/pages/Alerts.tsx` — Add Mark All Read, severity filter, delete
- `frontend/client/src/pages/Messages.tsx` — Add schedule/drip UI, pagination
- `frontend/client/src/pages/PackageDetail.tsx` — Add distribution mode selector, enhance health modal

---

## 8. What Will NOT Be Changed

The following will remain untouched:

- **Database connection configuration** (`database.py`, `settings.py`) — Your server connection strings will not be modified
- **Zentra API client** (`zentra/client.py`) — Already complete
- **DashboardLayout** — Already complete and working
- **Home page** — Already complete
- **Packages page** — Already complete (CRUD works)
- **Profiles page** — Already complete (aggregation works)
- **UI component library** — All shadcn/ui components remain as-is
- **Theme/styling** — Dark theme with teal accents remains unchanged
- **Package.json / dependencies** — No new dependencies needed
- **Vite configuration** — Proxy settings remain unchanged
- **Environment variables** — No changes to .env or server config

---

## Awaiting Your Approval

Please review this plan and confirm:
1. **Do you approve the implementation order?** (Steps 1-11 above)
2. **Are there any features you want to skip or deprioritize?**
3. **Are there any additional features you want added?**
4. **Should I proceed with creating the `feature/complete-project` branch and start implementing?**

Once approved, I will create the branch, implement each step in order (backend → frontend), and push commits after each completed step so you can track progress.
