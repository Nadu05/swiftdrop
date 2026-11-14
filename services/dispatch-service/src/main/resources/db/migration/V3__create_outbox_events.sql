-- ============================================================
-- SwiftDrop Dispatch Service - Schema Migration V3
-- Feature: Transactional Outbox Pattern for Reliable Event Publishing
-- Table: outbox_events
-- ============================================================

CREATE TABLE outbox_events (
    id             BIGSERIAL     PRIMARY KEY,
    event_id       VARCHAR(100)  NOT NULL,
    event_type     VARCHAR(100)  NOT NULL,
    event_version  INT           NOT NULL DEFAULT 1,
    routing_key    VARCHAR(255)  NOT NULL,
    payload        TEXT          NOT NULL,
    status         VARCHAR(30)   NOT NULL DEFAULT 'PENDING',
    retry_count    INT           NOT NULL DEFAULT 0,
    max_retries    INT           NOT NULL DEFAULT 5,
    error_message  TEXT,
    occurred_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at   TIMESTAMP,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_outbox_event_id UNIQUE (event_id),
    CONSTRAINT chk_outbox_status CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER'))
);

CREATE INDEX idx_outbox_status_occurred_at ON outbox_events (status, occurred_at);

