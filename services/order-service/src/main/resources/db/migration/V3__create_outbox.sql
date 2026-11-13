-- Transactional outbox: domain events are written in the same transaction as the business change
-- and relayed to RabbitMQ afterwards, so an event is never lost between "committed" and "published".
-- Delivery is at-least-once; consumers must de-duplicate on event_id.

CREATE TABLE outbox_events (
    id              BIGSERIAL     PRIMARY KEY,
    event_id        UUID          NOT NULL UNIQUE,
    routing_key     VARCHAR(100)  NOT NULL,
    payload         TEXT          NOT NULL,          -- full JSON envelope, contains ids only (no personal data)
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ,
    attempts        INT           NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    last_error      VARCHAR(200)
);

CREATE INDEX idx_outbox_pending ON outbox_events (next_attempt_at, id) WHERE published_at IS NULL;
