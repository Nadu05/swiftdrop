-- Order Service: delivery orders + official status history.
-- ID convention: BIGINT, matching the Organization service (Long ids).
-- Courier assignment lives in Dispatch; branches in Organization; users in Identity.
-- customer_id / branch_id / changed_by are cross-service REFERENCES: no foreign keys.

CREATE TABLE delivery_orders (
    id                     BIGSERIAL     PRIMARY KEY,
    tracking_number        VARCHAR(30)   NOT NULL UNIQUE,   -- public, non-sequential
    customer_id            BIGINT        NOT NULL,          -- Identity user id
    branch_id              BIGINT,                          -- Organization branch id
    status                 VARCHAR(30)   NOT NULL DEFAULT 'CREATED',

    pickup_address         VARCHAR(500)  NOT NULL,
    pickup_contact_name    VARCHAR(150)  NOT NULL,
    pickup_contact_phone   VARCHAR(30)   NOT NULL,
    dropoff_address        VARCHAR(500)  NOT NULL,
    dropoff_contact_name   VARCHAR(150)  NOT NULL,
    dropoff_contact_phone  VARCHAR(30)   NOT NULL,

    parcel_description     VARCHAR(500),
    parcel_size            VARCHAR(20)   NOT NULL,
    weight_kg              NUMERIC(8,2)  NOT NULL,
    delivery_instructions  VARCHAR(1000),

    delivery_fee           NUMERIC(12,2) NOT NULL,
    currency               VARCHAR(3)    NOT NULL DEFAULT 'LKR',
    distance_km            NUMERIC(8,2),

    idempotency_key        VARCHAR(64),
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_orders_status CHECK (status IN
        ('CREATED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED')),
    CONSTRAINT chk_orders_parcel_size CHECK (parcel_size IN
        ('SMALL','MEDIUM','LARGE','EXTRA_LARGE')),
    CONSTRAINT chk_orders_weight CHECK (weight_kg > 0),
    CONSTRAINT chk_orders_fee    CHECK (delivery_fee >= 0),
    CONSTRAINT uq_orders_customer_idempotency UNIQUE (customer_id, idempotency_key)
);

CREATE TABLE order_status_history (
    id          BIGSERIAL    PRIMARY KEY,
    order_id    BIGINT       NOT NULL REFERENCES delivery_orders(id),
    status      VARCHAR(30)  NOT NULL,
    note        VARCHAR(1000),
    location    VARCHAR(255),
    changed_by  BIGINT,                 -- Identity user id; NULL = system
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_history_status CHECK (status IN
        ('CREATED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED'))
);

CREATE INDEX idx_orders_customer ON delivery_orders (customer_id, created_at DESC);
CREATE INDEX idx_orders_status   ON delivery_orders (status);
CREATE INDEX idx_history_order   ON order_status_history (order_id, created_at);
