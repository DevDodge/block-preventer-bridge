-- Whats Guard Database Backup
-- Created: 2026-02-09T21:27:34.523045
-- Database: block_preventer_bridge
-- Host: 178.63.34.211:10034
-- Tables: 10
--

SET session_replication_role = 'replica';


-- Table: alerts
-- ----------------------------------------

DROP TABLE IF EXISTS "alerts" CASCADE;

CREATE TABLE "alerts" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "package_id" uuid,
    "profile_id" uuid,
    "alert_type" character varying(50) NOT NULL,
    "severity" character varying(20) DEFAULT 'warning'::character varying,
    "title" character varying(255) NOT NULL,
    "message" text NOT NULL,
    "is_read" boolean DEFAULT false,
    "is_resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "alerts" ADD PRIMARY KEY ("id");

-- Data for table: alerts (8 rows)
INSERT INTO "alerts" ("id", "package_id", "profile_id", "alert_type", "severity", "title", "message", "is_read", "is_resolved", "resolved_at", "created_at") VALUES ('742397ed-4963-4a60-8dd7-c9c1a94b8f3b', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', 'block_detected', 'critical', 'Profile Auto-Paused: Octobot Notification', 'Block indicators detected. 4 consecutive failures; Success rate 0.0% (threshold: 50.0%). Profile paused and will resume at 20:47 UTC.', TRUE, FALSE, NULL, '2026-02-09T20:47:42.868808+02:00');
INSERT INTO "alerts" ("id", "package_id", "profile_id", "alert_type", "severity", "title", "message", "is_read", "is_resolved", "resolved_at", "created_at") VALUES ('1b660768-95bd-4f58-b3de-f3ff7bdce197', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', 'block_detected', 'critical', 'Profile Auto-Paused: OCTOBOT', 'Block indicators detected. Success rate 0.0% (threshold: 50.0%). Profile paused and will resume at 20:47 UTC.', TRUE, FALSE, NULL, '2026-02-09T20:47:43.565697+02:00');
INSERT INTO "alerts" ("id", "package_id", "profile_id", "alert_type", "severity", "title", "message", "is_read", "is_resolved", "resolved_at", "created_at") VALUES ('28cb9551-f7f9-4cb5-a6c5-ba41ab4aa2d5', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', 'block_detected', 'critical', 'Profile Auto-Paused: Octobot Notification', 'Block indicators detected. 4 consecutive failures; Success rate 0.0% (threshold: 50.0%). Profile paused and will resume at 20:56 UTC.', TRUE, FALSE, NULL, '2026-02-09T20:56:20.612053+02:00');
INSERT INTO "alerts" ("id", "package_id", "profile_id", "alert_type", "severity", "title", "message", "is_read", "is_resolved", "resolved_at", "created_at") VALUES ('677b5978-4e40-4363-afb7-0231660dd9d2', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', 'block_detected', 'critical', 'Profile Auto-Paused: OCTOBOT', 'Block indicators detected. Success rate 0.0% (threshold: 50.0%). Profile paused and will resume at 20:56 UTC.', TRUE, FALSE, NULL, '2026-02-09T20:56:21.504513+02:00');
INSERT INTO "alerts" ("id", "package_id", "profile_id", "alert_type", "severity", "title", "message", "is_read", "is_resolved", "resolved_at", "created_at") VALUES ('9bb114d5-2f88-4f73-9b5d-65d4a40ad769', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', 'block_detected', 'critical', 'Profile Auto-Paused: Octobot Notification', 'Block indicators detected. 5 consecutive failures (threshold: 5); Success rate 0.0% (threshold: 50.0%). Profile paused and will resume at 20:57 UTC.', TRUE, FALSE, NULL, '2026-02-09T20:57:29.498020+02:00');
INSERT INTO "alerts" ("id", "package_id", "profile_id", "alert_type", "severity", "title", "message", "is_read", "is_resolved", "resolved_at", "created_at") VALUES ('0d37839f-a193-4a06-8b58-92d4369332d5', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', 'block_detected', 'critical', 'Profile Auto-Paused: OCTOBOT', 'Block indicators detected. Success rate 0.0% (threshold: 50.0%). Profile paused and will resume at 20:57 UTC.', TRUE, FALSE, NULL, '2026-02-09T20:57:31.953260+02:00');
INSERT INTO "alerts" ("id", "package_id", "profile_id", "alert_type", "severity", "title", "message", "is_read", "is_resolved", "resolved_at", "created_at") VALUES ('b0911411-b1d4-41c0-b4cb-2cd8873bf3ef', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', 'block_detected', 'critical', 'Profile Auto-Paused: OCTOBOT', 'Block indicators detected. Success rate 0.0% (threshold: 50.0%). Profile paused and will resume at 19:49 UTC.', TRUE, FALSE, NULL, '2026-02-09T19:49:23.176893+02:00');
INSERT INTO "alerts" ("id", "package_id", "profile_id", "alert_type", "severity", "title", "message", "is_read", "is_resolved", "resolved_at", "created_at") VALUES ('d9a94675-fda6-44d4-8dbf-0081e3bab698', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', 'block_detected', 'critical', 'Profile Auto-Paused: Octobot Notification', 'Block indicators detected. 4 consecutive failures; Success rate 0.0% (threshold: 50.0%). Profile paused and will resume at 19:49 UTC.', TRUE, FALSE, NULL, '2026-02-09T19:49:26.013842+02:00');


-- Table: conversation_routing
-- ----------------------------------------

DROP TABLE IF EXISTS "conversation_routing" CASCADE;

CREATE TABLE "conversation_routing" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "package_id" uuid NOT NULL,
    "customer_phone" character varying(50) NOT NULL,
    "assigned_profile_id" uuid NOT NULL,
    "last_interaction_at" timestamp with time zone DEFAULT now(),
    "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "conversation_routing" ADD PRIMARY KEY ("id");

-- Data for table: conversation_routing (3 rows)
INSERT INTO "conversation_routing" ("id", "package_id", "customer_phone", "assigned_profile_id", "last_interaction_at", "created_at") VALUES ('f504dba0-74a5-41a8-9cd5-163274eb068b', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', '201203581871', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '2026-02-09T05:08:54.355594+02:00', '2026-02-09T05:08:54.358146+02:00');
INSERT INTO "conversation_routing" ("id", "package_id", "customer_phone", "assigned_profile_id", "last_interaction_at", "created_at") VALUES ('c5761ef1-bb21-4523-b530-1a6d7c93feb8', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', '+201118180845', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '2026-02-09T05:12:25.628300+02:00', '2026-02-09T05:12:25.630216+02:00');
INSERT INTO "conversation_routing" ("id", "package_id", "customer_phone", "assigned_profile_id", "last_interaction_at", "created_at") VALUES ('0b691c02-f589-4052-a36b-f5f7ee280812', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', '201118180845', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '2026-02-09T05:12:57.921500+02:00', '2026-02-09T05:12:43.870510+02:00');


-- Table: delivery_logs
-- ----------------------------------------

DROP TABLE IF EXISTS "delivery_logs" CASCADE;

CREATE TABLE "delivery_logs" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "message_id" uuid NOT NULL,
    "profile_id" uuid NOT NULL,
    "recipient" character varying(50) NOT NULL,
    "zentra_message_id" character varying(100),
    "message_mode" character varying(10) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "attempt_count" integer DEFAULT 1,
    "error_message" text,
    "response_time_ms" integer,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "delivery_logs" ADD PRIMARY KEY ("id");

-- Data for table: delivery_logs (7 rows)
INSERT INTO "delivery_logs" ("id", "message_id", "profile_id", "recipient", "zentra_message_id", "message_mode", "status", "attempt_count", "error_message", "response_time_ms", "sent_at", "delivered_at", "created_at") VALUES ('5cbc4b42-86b6-452b-9d96-f1609d7535af', '224ddd53-3b4e-4d89-8c0e-0818bda4729b', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '+201012345678', NULL, 'open', 'failed', 1, NULL, 1666, NULL, NULL, '2026-02-09T20:57:26.099452+02:00');
INSERT INTO "delivery_logs" ("id", "message_id", "profile_id", "recipient", "zentra_message_id", "message_mode", "status", "attempt_count", "error_message", "response_time_ms", "sent_at", "delivered_at", "created_at") VALUES ('9a7525bf-b520-48a1-b0f2-ea87eb226fb7', '224ddd53-3b4e-4d89-8c0e-0818bda4729b', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', '+201098765432', NULL, 'open', 'failed', 1, NULL, 944, NULL, NULL, '2026-02-09T20:57:30.732203+02:00');
INSERT INTO "delivery_logs" ("id", "message_id", "profile_id", "recipient", "zentra_message_id", "message_mode", "status", "attempt_count", "error_message", "response_time_ms", "sent_at", "delivered_at", "created_at") VALUES ('a6918a19-1a61-4657-8034-b351a17c6adb', 'bf928d6d-7d7c-4b8a-be4d-580a6ada96a8', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '201118180845', NULL, 'reply', 'failed', 1, 'Cannot connect to host api.zentra.io:443 ssl:default [nodename nor servname provided, or not known]', 2, NULL, NULL, '2026-02-09T05:12:58.136620+02:00');
INSERT INTO "delivery_logs" ("id", "message_id", "profile_id", "recipient", "zentra_message_id", "message_mode", "status", "attempt_count", "error_message", "response_time_ms", "sent_at", "delivered_at", "created_at") VALUES ('5b3b4075-c3dc-4a9f-b14e-533f26528a09', 'c552ace2-182b-4aa7-a8d3-9f47673f7216', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', '201118180845', NULL, 'open', 'failed', 1, NULL, 858, NULL, NULL, '2026-02-09T19:49:20.907499+02:00');
INSERT INTO "delivery_logs" ("id", "message_id", "profile_id", "recipient", "zentra_message_id", "message_mode", "status", "attempt_count", "error_message", "response_time_ms", "sent_at", "delivered_at", "created_at") VALUES ('c9bb896c-ca4f-409d-b107-5088ee9f4c56', '8ec5d247-1e1f-48a2-85f7-1630b577e662', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '+201118180845', NULL, 'reply', 'failed', 1, 'Cannot connect to host api.zentra.io:443 ssl:default [nodename nor servname provided, or not known]', 2, NULL, NULL, '2026-02-09T05:12:25.851252+02:00');
INSERT INTO "delivery_logs" ("id", "message_id", "profile_id", "recipient", "zentra_message_id", "message_mode", "status", "attempt_count", "error_message", "response_time_ms", "sent_at", "delivered_at", "created_at") VALUES ('4129f356-b62b-4066-b7c5-6bd39180abcb', '3cc21c46-7720-431c-8b34-805b2ddf57ce', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '201203581871', NULL, 'reply', 'failed', 1, 'Cannot connect to host api.zentra.io:443 ssl:default [nodename nor servname provided, or not known]', 2, NULL, NULL, '2026-02-09T05:08:54.576922+02:00');
INSERT INTO "delivery_logs" ("id", "message_id", "profile_id", "recipient", "zentra_message_id", "message_mode", "status", "attempt_count", "error_message", "response_time_ms", "sent_at", "delivered_at", "created_at") VALUES ('9bfa3a5f-6061-433a-8209-df05e071d489', '198be976-f9ac-4433-ad7d-232e3959c3f0', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '201118180845', NULL, 'reply', 'failed', 1, 'Cannot connect to host api.zentra.io:443 ssl:default [nodename nor servname provided, or not known]', 3, NULL, NULL, '2026-02-09T05:12:44.021257+02:00');


-- Table: global_settings
-- ----------------------------------------

DROP TABLE IF EXISTS "global_settings" CASCADE;

CREATE TABLE "global_settings" (
    "id" uuid NOT NULL,
    "global_cooldown_min" integer,
    "global_cooldown_max" integer,
    "max_daily_messages_global" integer,
    "auto_pause_enabled" boolean,
    "auto_pause_failure_threshold" integer,
    "auto_pause_success_rate_threshold" double precision,
    "block_detection_enabled" boolean,
    "risk_alert_threshold" integer,
    "auto_adjust_limits_global" boolean,
    "active_hours_start" character varying(10),
    "active_hours_end" character varying(10),
    "webhook_url" text,
    "webhook_enabled" boolean,
    "notification_email" text,
    "email_notifications_enabled" boolean,
    "theme" character varying(20),
    "timezone" character varying(50),
    "updated_at" timestamp with time zone
);

ALTER TABLE "global_settings" ADD PRIMARY KEY ("id");

-- Data for table: global_settings (1 rows)
INSERT INTO "global_settings" ("id", "global_cooldown_min", "global_cooldown_max", "max_daily_messages_global", "auto_pause_enabled", "auto_pause_failure_threshold", "auto_pause_success_rate_threshold", "block_detection_enabled", "risk_alert_threshold", "auto_adjust_limits_global", "active_hours_start", "active_hours_end", "webhook_url", "webhook_enabled", "notification_email", "email_notifications_enabled", "theme", "timezone", "updated_at") VALUES ('ee34a655-5aeb-45db-9c40-2b6ec1a46afc', 300, 900, 500, TRUE, 5, 70.0, TRUE, 60, TRUE, '04:00', '00:00', '', FALSE, '', FALSE, 'dark', 'UTC', '2026-02-09T04:43:19.262640+02:00');


-- Table: message_queue
-- ----------------------------------------

DROP TABLE IF EXISTS "message_queue" CASCADE;

CREATE TABLE "message_queue" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "message_id" uuid NOT NULL,
    "profile_id" uuid NOT NULL,
    "recipient" character varying(50) NOT NULL,
    "message_type" character varying(20) NOT NULL,
    "content" text NOT NULL,
    "media_url" text,
    "caption" text,
    "status" character varying(20) DEFAULT 'waiting'::character varying,
    "priority" integer DEFAULT 0,
    "scheduled_send_at" timestamp with time zone,
    "attempt_count" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "last_error" text,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "message_queue" ADD PRIMARY KEY ("id");

-- Data for table: message_queue (10 rows)
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('9ca4ad73-154a-41de-b8c2-ed19a614150f', 'c552ace2-182b-4aa7-a8d3-9f47673f7216', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', '201118180845', 'text', 'dodge', NULL, NULL, 'cancelled', 0, '2026-02-09T19:49:30.906307+02:00', 1, 3, 'Profile auto-paused due to block detection', NULL, '2026-02-09T05:22:53.596929+02:00', '2026-02-09T19:49:23.034820+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('be93f568-bc13-4799-b4a2-158c6f1b6cec', '3e470938-94ee-4825-a1aa-e59b936580ec', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', '201118180845', 'text', 'text for checking', NULL, NULL, 'failed', 0, '2026-02-09T16:49:53.680851+02:00', 1, 3, 'Profile not available', NULL, '2026-02-09T16:49:53.681424+02:00', '2026-02-09T19:49:23.471103+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('f813e746-f428-4f2f-b4b1-5a373c45fcee', '224ddd53-3b4e-4d89-8c0e-0818bda4729b', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '+201012345678', 'text', 'Hello! This is a new conversation from Whats Guard.', NULL, NULL, 'cancelled', 0, '2026-02-09T20:57:36.098423+02:00', 1, 3, 'Profile auto-paused due to block detection', NULL, '2026-02-09T20:57:09.399512+02:00', '2026-02-09T20:57:29.360305+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('995f20e8-a6dd-4e58-8155-f74b7efe8663', '224ddd53-3b4e-4d89-8c0e-0818bda4729b', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', '+201098765432', 'text', 'Hello! This is a new conversation from Whats Guard.', NULL, NULL, 'cancelled', 0, '2026-02-09T20:57:40.731674+02:00', 1, 3, 'Profile auto-paused due to block detection', NULL, '2026-02-09T20:57:10.059764+02:00', '2026-02-09T20:57:31.871287+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('24e72070-e2f0-432c-a190-992967d6eaaa', '72b256d4-cfe6-458e-9e8a-e81998695b93', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '201118180845', 'text', 'HI.... Hi.... Hi....', NULL, NULL, 'failed', 0, '2026-02-09T05:08:30.609631+02:00', 0, 3, 'Cleared - loop bug fix', NULL, '2026-02-09T05:08:30.610782+02:00', '2026-02-09T05:20:54.214584+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('e5692143-47b2-46bf-8528-54a6da27dd51', '72b256d4-cfe6-458e-9e8a-e81998695b93', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', '201203581871', 'text', 'HI.... Hi.... Hi....', NULL, NULL, 'failed', 0, '2026-02-09T05:08:31.253239+02:00', 0, 3, 'Cleared - loop bug fix', NULL, '2026-02-09T05:08:31.253617+02:00', '2026-02-09T05:20:54.214584+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('203694f2-83b6-4da6-8c28-8b8a465ba4df', '561b6942-9dfd-424f-911b-855f66dd02fa', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '201118180845', 'text', 'HI.... Hi.... Hi....', NULL, NULL, 'failed', 0, '2026-02-09T05:08:31.853356+02:00', 0, 3, 'Cleared - loop bug fix', NULL, '2026-02-09T05:08:31.854496+02:00', '2026-02-09T05:20:54.214584+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('ba434dd9-e597-4cfc-a3bb-c8fefc8f7cc9', '561b6942-9dfd-424f-911b-855f66dd02fa', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', '201203581871', 'text', 'HI.... Hi.... Hi....', NULL, NULL, 'failed', 0, '2026-02-09T05:08:32.417675+02:00', 0, 3, 'Cleared - loop bug fix', NULL, '2026-02-09T05:08:32.419195+02:00', '2026-02-09T05:20:54.214584+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('84956919-8ca5-4f89-9776-6dc9002d5c18', '543f97e7-ad1c-4b0b-a3e7-2def3dd71208', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', '201118180845', 'text', 'HI', NULL, NULL, 'failed', 0, '2026-02-09T05:06:59.733022+02:00', 0, 3, 'Cleared - loop bug fix', NULL, '2026-02-09T05:06:59.735458+02:00', '2026-02-09T05:20:54.214584+02:00');
INSERT INTO "message_queue" ("id", "message_id", "profile_id", "recipient", "message_type", "content", "media_url", "caption", "status", "priority", "scheduled_send_at", "attempt_count", "max_attempts", "last_error", "sent_at", "created_at", "updated_at") VALUES ('3cc15016-e2a6-4002-845c-f8c9ec9f1c36', '543f97e7-ad1c-4b0b-a3e7-2def3dd71208', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', '201203581871', 'text', 'HI', NULL, NULL, 'failed', 0, '2026-02-09T05:07:00.405330+02:00', 0, 3, 'Cleared - loop bug fix', NULL, '2026-02-09T05:07:00.405732+02:00', '2026-02-09T05:20:54.214584+02:00');


-- Table: messages
-- ----------------------------------------

DROP TABLE IF EXISTS "messages" CASCADE;

CREATE TABLE "messages" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "package_id" uuid NOT NULL,
    "message_mode" character varying(10) NOT NULL,
    "message_type" character varying(20) NOT NULL,
    "content" text NOT NULL,
    "media_url" text,
    "caption" text,
    "recipients" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "scheduled_at" timestamp with time zone,
    "total_recipients" integer NOT NULL DEFAULT 0,
    "processed_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "success_count" integer DEFAULT 0,
    "distribution_result" jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "messages" ADD PRIMARY KEY ("id");

-- Data for table: messages (10 rows)
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('8ec5d247-1e1f-48a2-85f7-1630b577e662', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'reply', 'text', 'Thank you for your message! How can I help you today?', NULL, NULL, '[''+201118180845'']', 'failed', NULL, 1, 1, 1, 0, NULL, '2026-02-09T05:12:25.543767+02:00', '2026-02-09T05:12:25.775699+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('3e470938-94ee-4825-a1aa-e59b936580ec', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'open', 'text', 'text for checking', NULL, NULL, '[''201118180845'']', 'queued', NULL, 1, 0, 0, 0, '{''d0f68d68-2e91-4750-84a8-e48095b2daaf'': [''201118180845'']}', '2026-02-09T16:49:52.364760+02:00', '2026-02-09T16:49:52.711989+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('198be976-f9ac-4433-ad7d-232e3959c3f0', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'reply', 'text', 'Thank you for your message! How can I help you today?', NULL, NULL, '[''201118180845'']', 'failed', NULL, 1, 1, 1, 0, NULL, '2026-02-09T05:12:43.797263+02:00', '2026-02-09T05:12:43.949476+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('bf928d6d-7d7c-4b8a-be4d-580a6ada96a8', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'reply', 'text', 'Thank you for your message! How can I help you today?', NULL, NULL, '[''201118180845'']', 'failed', NULL, 1, 1, 1, 0, NULL, '2026-02-09T05:12:57.847905+02:00', '2026-02-09T05:12:58.064036+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('c552ace2-182b-4aa7-a8d3-9f47673f7216', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'open', 'text', 'dodge', NULL, NULL, '[''201118180845'']', 'completed', NULL, 1, 1, 1, 0, '{''d0f68d68-2e91-4750-84a8-e48095b2daaf'': [''201118180845'']}', '2026-02-09T05:22:52.026808+02:00', '2026-02-09T19:49:21.392470+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('224ddd53-3b4e-4d89-8c0e-0818bda4729b', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'open', 'text', 'Hello! This is a new conversation from Whats Guard.', NULL, NULL, '[''+201012345678'', ''+201098765432'']', 'completed', NULL, 2, 2, 2, 0, '{''95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf'': [''+201012345678''], ''d0f68d68-2e91-4750-84a8-e48095b2daaf'': [''+201098765432'']}', '2026-02-09T20:57:07.800506+02:00', '2026-02-09T20:57:30.964100+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('543f97e7-ad1c-4b0b-a3e7-2def3dd71208', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'open', 'text', 'HI', NULL, NULL, '[''201118180845'', ''201203581871'']', 'queued', NULL, 2, 0, 0, 0, '{''95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf'': [''201118180845''], ''d0f68d68-2e91-4750-84a8-e48095b2daaf'': [''201203581871'']}', '2026-02-09T05:06:58.497747+02:00', '2026-02-09T05:06:58.860365+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('72b256d4-cfe6-458e-9e8a-e81998695b93', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'open', 'text', 'HI.... Hi.... Hi....', NULL, NULL, '[''201118180845'', ''201203581871'']', 'queued', NULL, 2, 0, 0, 0, '{''95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf'': [''201118180845''], ''d0f68d68-2e91-4750-84a8-e48095b2daaf'': [''201203581871'']}', '2026-02-09T05:08:29.370658+02:00', '2026-02-09T05:08:29.721805+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('561b6942-9dfd-424f-911b-855f66dd02fa', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'open', 'text', 'HI.... Hi.... Hi....', NULL, NULL, '[''201118180845'', ''201203581871'']', 'queued', NULL, 2, 0, 0, 0, '{''95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf'': [''201118180845''], ''d0f68d68-2e91-4750-84a8-e48095b2daaf'': [''201203581871'']}', '2026-02-09T05:08:30.902006+02:00', '2026-02-09T05:08:31.209479+02:00');
INSERT INTO "messages" ("id", "package_id", "message_mode", "message_type", "content", "media_url", "caption", "recipients", "status", "scheduled_at", "total_recipients", "processed_count", "failed_count", "success_count", "distribution_result", "created_at", "updated_at") VALUES ('3cc21c46-7720-431c-8b34-805b2ddf57ce', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'reply', 'text', 'HI', NULL, NULL, '[''201203581871'']', 'failed', NULL, 1, 1, 1, 0, NULL, '2026-02-09T05:08:54.193261+02:00', '2026-02-09T05:08:54.506142+02:00');


-- Table: packages
-- ----------------------------------------

DROP TABLE IF EXISTS "packages" CASCADE;

CREATE TABLE "packages" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(255) NOT NULL,
    "description" text,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "distribution_mode" character varying(20) DEFAULT 'round_robin'::character varying,
    "max_messages_per_hour" integer DEFAULT 20,
    "max_messages_per_3hours" integer DEFAULT 45,
    "max_messages_per_day" integer DEFAULT 120,
    "max_concurrent_sends" integer DEFAULT 4,
    "active_hours_start" character varying(10) DEFAULT '04:00:00'::time without time zone,
    "active_hours_end" character varying(10) DEFAULT '00:00:00'::time without time zone,
    "freeze_duration_hours" integer DEFAULT 4,
    "rush_hour_threshold" integer DEFAULT 10,
    "rush_hour_multiplier" double precision DEFAULT 2.0,
    "quiet_mode_threshold" integer DEFAULT 5,
    "quiet_mode_multiplier" double precision DEFAULT 0.5,
    "auto_adjust_limits" boolean DEFAULT true,
    "auto_pause_on_failures" boolean DEFAULT true,
    "auto_pause_failure_threshold" integer DEFAULT 5,
    "auto_pause_success_rate_threshold" double precision DEFAULT 50.0,
    "alert_risk_score_threshold" integer DEFAULT 50,
    "retry_failed_messages" boolean DEFAULT true,
    "retry_attempts" integer DEFAULT 3,
    "retry_delay_seconds" integer DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "packages" ADD PRIMARY KEY ("id");

-- Data for table: packages (1 rows)
INSERT INTO "packages" ("id", "name", "description", "status", "distribution_mode", "max_messages_per_hour", "max_messages_per_3hours", "max_messages_per_day", "max_concurrent_sends", "active_hours_start", "active_hours_end", "freeze_duration_hours", "rush_hour_threshold", "rush_hour_multiplier", "quiet_mode_threshold", "quiet_mode_multiplier", "auto_adjust_limits", "auto_pause_on_failures", "auto_pause_failure_threshold", "auto_pause_success_rate_threshold", "alert_risk_score_threshold", "retry_failed_messages", "retry_attempts", "retry_delay_seconds", "created_at", "updated_at") VALUES ('be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'Dodge Pack', 'Dodge Main package for testing', 'active', 'smart', 20, 45, 120, 4, '04:00:00', '00:00:00', 4, 10, 2.0, 5, 0.5, TRUE, TRUE, 5, 50.0, 50, TRUE, 3, 5, '2026-02-09T02:29:37.191355+02:00', '2026-02-09T02:29:37.191367+02:00');


-- Table: profile_statistics
-- ----------------------------------------

DROP TABLE IF EXISTS "profile_statistics" CASCADE;

CREATE TABLE "profile_statistics" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "profile_id" uuid NOT NULL,
    "messages_sent_total" bigint DEFAULT 0,
    "messages_sent_today" integer DEFAULT 0,
    "messages_sent_hour" integer DEFAULT 0,
    "messages_sent_3hours" integer DEFAULT 0,
    "messages_received_today" integer DEFAULT 0,
    "failed_messages_today" integer DEFAULT 0,
    "failed_messages_hour" integer DEFAULT 0,
    "success_rate_24h" double precision DEFAULT 100.0,
    "avg_response_time_ms" double precision DEFAULT 0.0,
    "current_cooldown_seconds" integer DEFAULT 0,
    "cooldown_expires_at" timestamp with time zone,
    "cooldown_mode" character varying(20) DEFAULT 'normal'::character varying,
    "last_hour_reset_at" timestamp with time zone DEFAULT now(),
    "last_3hour_reset_at" timestamp with time zone DEFAULT now(),
    "last_day_reset_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "profile_statistics" ADD PRIMARY KEY ("id");

-- Data for table: profile_statistics (2 rows)
INSERT INTO "profile_statistics" ("id", "profile_id", "messages_sent_total", "messages_sent_today", "messages_sent_hour", "messages_sent_3hours", "messages_received_today", "failed_messages_today", "failed_messages_hour", "success_rate_24h", "avg_response_time_ms", "current_cooldown_seconds", "cooldown_expires_at", "cooldown_mode", "last_hour_reset_at", "last_3hour_reset_at", "last_day_reset_at", "updated_at") VALUES ('e35729cb-4623-4c45-a814-804ab654e7d8', '95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', 5, 5, 1, 1, 0, 5, 1, 0.0, 834.125, 172, '2026-02-09T21:00:01.255851+02:00', 'quiet', '2026-02-09T20:39:25.384835+02:00', '2026-02-09T19:42:29.935240+02:00', '2026-02-09T05:00:02.826072+02:00', '2026-02-09T20:57:27.169419+02:00');
INSERT INTO "profile_statistics" ("id", "profile_id", "messages_sent_total", "messages_sent_today", "messages_sent_hour", "messages_sent_3hours", "messages_received_today", "failed_messages_today", "failed_messages_hour", "success_rate_24h", "avg_response_time_ms", "current_cooldown_seconds", "cooldown_expires_at", "cooldown_mode", "last_hour_reset_at", "last_3hour_reset_at", "last_day_reset_at", "updated_at") VALUES ('4d431fed-e7f0-4dd5-bb7c-a54ed527847b', 'd0f68d68-2e91-4750-84a8-e48095b2daaf', 2, 2, 1, 2, 0, 2, 1, 0.0, 901.0, 335, '2026-02-09T21:02:44.982986+02:00', 'quiet', '2026-02-09T20:39:25.384835+02:00', '2026-02-09T19:42:29.935240+02:00', '2026-02-09T05:01:03.292396+02:00', '2026-02-09T20:57:31.169192+02:00');


-- Table: profiles
-- ----------------------------------------

DROP TABLE IF EXISTS "profiles" CASCADE;

CREATE TABLE "profiles" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "package_id" uuid NOT NULL,
    "name" character varying(255) NOT NULL,
    "phone_number" character varying(50),
    "zentra_uuid" character varying(64) NOT NULL,
    "zentra_api_token" text NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "pause_reason" text,
    "resume_at" timestamp with time zone,
    "manual_priority" integer DEFAULT 5,
    "weight_score" double precision DEFAULT 10.0,
    "account_age_months" integer DEFAULT 0,
    "health_score" integer DEFAULT 100,
    "risk_score" integer DEFAULT 0,
    "last_message_at" timestamp with time zone,
    "last_block_at" timestamp with time zone,
    "last_health_check_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "profiles" ADD PRIMARY KEY ("id");

-- Data for table: profiles (2 rows)
INSERT INTO "profiles" ("id", "package_id", "name", "phone_number", "zentra_uuid", "zentra_api_token", "status", "pause_reason", "resume_at", "manual_priority", "weight_score", "account_age_months", "health_score", "risk_score", "last_message_at", "last_block_at", "last_health_check_at", "created_at", "updated_at") VALUES ('d0f68d68-2e91-4750-84a8-e48095b2daaf', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'OCTOBOT', '201505354810', 'ed9b954d-8156-4d7b-bc56-79ec23e37ba5', '6559eeca-b733-41e9-b96b-91c8ed80b8aa', 'paused', 'Auto-paused: Success rate 0.0% (threshold: 50.0%)', '2026-02-09T22:57:31.799031+02:00', 5, 52.0, 0, 100, 0, '2026-02-09T20:57:31.247795+02:00', '2026-02-09T20:57:31.799023+02:00', NULL, '2026-02-09T05:01:03.142920+02:00', '2026-02-09T20:57:31.799373+02:00');
INSERT INTO "profiles" ("id", "package_id", "name", "phone_number", "zentra_uuid", "zentra_api_token", "status", "pause_reason", "resume_at", "manual_priority", "weight_score", "account_age_months", "health_score", "risk_score", "last_message_at", "last_block_at", "last_health_check_at", "created_at", "updated_at") VALUES ('95ff6bd8-0691-449a-8ea6-99c7f3ddeaaf', 'be5ca2ae-141c-485a-96d0-ec4dfbbadd7d', 'Octobot Notification', '201070212481', '50b7cfc0-d89a-4f40-8dec-67e3ade8f2dc', '725ad3ae-65f2-4f8c-a819-d5b18166ef2f', 'paused', 'Auto-paused: 5 consecutive failures (threshold: 5)', '2026-02-09T22:57:28.906687+02:00', 5, 52.0, 0, 100, 0, '2026-02-09T20:57:27.310235+02:00', '2026-02-09T20:57:28.906680+02:00', NULL, '2026-02-09T05:00:02.649763+02:00', '2026-02-09T20:57:28.907148+02:00');


-- Table: system_settings
-- ----------------------------------------

DROP TABLE IF EXISTS "system_settings" CASCADE;

CREATE TABLE "system_settings" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "key" character varying(100) NOT NULL,
    "value" text NOT NULL,
    "description" text,
    "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "system_settings" ADD PRIMARY KEY ("id");

-- Data for table: system_settings (5 rows)
INSERT INTO "system_settings" ("id", "key", "value", "description", "updated_at") VALUES ('33a96c88-a470-4b59-8f10-d52a55d090b5', 'health_check_interval_minutes', '30', 'How often to check profile health via Zentra', '2026-02-09T00:52:47.943919+02:00');
INSERT INTO "system_settings" ("id", "key", "value", "description", "updated_at") VALUES ('f1cf3768-e37e-41d0-9ab3-c6f32b34e32a', 'stats_reset_interval_minutes', '60', 'How often to reset hourly stats', '2026-02-09T00:52:47.943919+02:00');
INSERT INTO "system_settings" ("id", "key", "value", "description", "updated_at") VALUES ('10ff0e60-d0d1-4560-b0f5-8711c7722295', 'default_cooldown_min_seconds', '300', 'Minimum cooldown between messages (5 min)', '2026-02-09T00:52:47.943919+02:00');
INSERT INTO "system_settings" ("id", "key", "value", "description", "updated_at") VALUES ('8fe58048-d42e-4de3-babd-745205cc946f', 'default_cooldown_max_seconds', '900', 'Maximum cooldown between messages (15 min)', '2026-02-09T00:52:47.943919+02:00');
INSERT INTO "system_settings" ("id", "key", "value", "description", "updated_at") VALUES ('b1e3444d-b6f8-49e9-9602-5fb253c2df71', 'queue_processor_interval_seconds', '30', 'How often to check queue for pending messages', '2026-02-09T00:52:47.943919+02:00');


SET session_replication_role = 'origin';

-- End of backup
