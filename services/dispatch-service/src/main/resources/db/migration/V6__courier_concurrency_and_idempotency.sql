-- Courier management: optimistic locking + idempotent courier actions.
ALTER TABLE courier_assignments ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE delivery_jobs       ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS courier_idempotency_keys (
    id              BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(100) NOT NULL,
    actor_id        VARCHAR(100) NOT NULL,
    operation       VARCHAR(40)  NOT NULL,
    assignment_ref  VARCHAR(100) NOT NULL,
    request_hash    VARCHAR(64)  NOT NULL,
    response_json   TEXT         NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_courier_idempotency UNIQUE (actor_id, idempotency_key)
);
