CREATE TABLE IF NOT EXISTS notifications (
    id                 BIGSERIAL PRIMARY KEY,
    notification_code  VARCHAR(64)   NOT NULL UNIQUE,
    event_id           VARCHAR(100)  NOT NULL,
    event_type         VARCHAR(100)  NOT NULL,
    notification_type  VARCHAR(80)   NOT NULL,
    channel            VARCHAR(30)   NOT NULL DEFAULT 'EMAIL',
    recipient_user_id  VARCHAR(100),
    recipient_email    VARCHAR(255),
    recipient_name     VARCHAR(200),
    tracking_number    VARCHAR(40),
    order_id           VARCHAR(64),
    application_code   VARCHAR(64),
    title              VARCHAR(255)  NOT NULL,
    message            VARCHAR(2000) NOT NULL,
    correlation_id     VARCHAR(80),
    status             VARCHAR(30)   NOT NULL DEFAULT 'PENDING',
    attempt_count      INTEGER       NOT NULL DEFAULT 0,
    error_message      VARCHAR(1000),
    read_at            TIMESTAMP,
    sent_at            TIMESTAMP,
    created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_email_created
    ON notifications (recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_tracking
    ON notifications (tracking_number, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_order_contacts (
    id                      BIGSERIAL PRIMARY KEY,
    order_id                VARCHAR(64),
    tracking_number         VARCHAR(40)  NOT NULL UNIQUE,
    customer_user_id        VARCHAR(100),
    customer_email          VARCHAR(255),
    sender_name             VARCHAR(200),
    sender_email            VARCHAR(255),
    recipient_name          VARCHAR(200),
    recipient_email         VARCHAR(255),
    origin_branch_name      VARCHAR(200),
    destination_branch_name VARCHAR(200),
    updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS processed_domain_events (
    id             BIGSERIAL PRIMARY KEY,
    event_id       VARCHAR(100) NOT NULL,
    consumer_group VARCHAR(80)  NOT NULL,
    event_type     VARCHAR(100) NOT NULL,
    correlation_id VARCHAR(80),
    processed_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notification_processed_event UNIQUE (event_id, consumer_group)
);

