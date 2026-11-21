-- =============================================================================
-- V4__ensure_order_schema_alignment.sql
-- Ensures Neon cloud databases that had an earlier pre-refactor V2 applied
-- are aligned with the canonical V2 Order domain schema.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'pricing_quotes'
    ) OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'delivery_orders'
          AND column_name = 'quote_reference'
    ) THEN
        DROP TABLE IF EXISTS
            payment_references,
            tracking_events,
            parcels,
            delivery_orders,
            pricing_quotes
        CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS pricing_quotes (
    id                      BIGSERIAL PRIMARY KEY,
    quote_reference         VARCHAR(64) NOT NULL UNIQUE,
    pickup_address          VARCHAR(500) NOT NULL,
    pickup_latitude         DOUBLE PRECISION NOT NULL,
    pickup_longitude        DOUBLE PRECISION NOT NULL,
    dropoff_address         VARCHAR(500) NOT NULL,
    destination_latitude    DOUBLE PRECISION NOT NULL,
    destination_longitude   DOUBLE PRECISION NOT NULL,
    origin_branch_id        BIGINT NOT NULL,
    origin_branch_code      VARCHAR(50) NOT NULL,
    origin_branch_name      VARCHAR(200) NOT NULL,
    destination_branch_id   BIGINT NOT NULL,
    destination_branch_code VARCHAR(50) NOT NULL,
    destination_branch_name VARCHAR(200) NOT NULL,
    same_branch             BOOLEAN NOT NULL DEFAULT FALSE,
    parcel_size             VARCHAR(30) NOT NULL,
    weight_kg               NUMERIC(8, 2) NOT NULL,
    estimated_distance_km   NUMERIC(8, 2) NOT NULL,
    base_fee                NUMERIC(10, 2) NOT NULL,
    distance_fee            NUMERIC(10, 2) NOT NULL,
    weight_fee              NUMERIC(10, 2) NOT NULL,
    size_surcharge          NUMERIC(10, 2) NOT NULL,
    estimated_fee           NUMERIC(10, 2) NOT NULL,
    currency                VARCHAR(10) NOT NULL DEFAULT 'LKR',
    provisional_pricing     BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at              TIMESTAMP NOT NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pricing_quotes_ref ON pricing_quotes(quote_reference);

CREATE TABLE IF NOT EXISTS delivery_orders (
    id                          BIGSERIAL PRIMARY KEY,
    tracking_number             VARCHAR(32) NOT NULL UNIQUE,
    order_source_type           VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
    customer_user_id            VARCHAR(100),
    customer_email              VARCHAR(255),
    merchant_organization_id    VARCHAR(100),
    pickup_method               VARCHAR(30) NOT NULL DEFAULT 'COURIER_PICKUP',
    pickup_address              VARCHAR(500) NOT NULL,
    pickup_city                 VARCHAR(120),
    pickup_postal_code          VARCHAR(30),
    pickup_latitude             DOUBLE PRECISION NOT NULL,
    pickup_longitude            DOUBLE PRECISION NOT NULL,
    pickup_contact_name         VARCHAR(200) NOT NULL,
    pickup_contact_phone        VARCHAR(50) NOT NULL,
    pickup_contact_email        VARCHAR(255),
    dropoff_address             VARCHAR(500) NOT NULL,
    dropoff_city                VARCHAR(120),
    dropoff_postal_code         VARCHAR(30),
    destination_latitude        DOUBLE PRECISION NOT NULL,
    destination_longitude       DOUBLE PRECISION NOT NULL,
    dropoff_contact_name        VARCHAR(200) NOT NULL,
    dropoff_contact_phone       VARCHAR(50) NOT NULL,
    dropoff_contact_email       VARCHAR(255),
    origin_branch_id            BIGINT NOT NULL,
    origin_branch_code          VARCHAR(50) NOT NULL,
    origin_branch_name          VARCHAR(200) NOT NULL,
    destination_branch_id       BIGINT NOT NULL,
    destination_branch_code     VARCHAR(50) NOT NULL,
    destination_branch_name     VARCHAR(200) NOT NULL,
    same_branch                 BOOLEAN NOT NULL DEFAULT FALSE,
    distance_km                 NUMERIC(8, 2) NOT NULL,
    quote_reference             VARCHAR(64),
    base_fee                    NUMERIC(10, 2) NOT NULL,
    distance_fee                NUMERIC(10, 2) NOT NULL,
    weight_fee                  NUMERIC(10, 2) NOT NULL,
    size_surcharge              NUMERIC(10, 2) NOT NULL,
    delivery_fee                NUMERIC(10, 2) NOT NULL,
    currency                    VARCHAR(10) NOT NULL DEFAULT 'LKR',
    payment_method              VARCHAR(30) NOT NULL DEFAULT 'PREPAID',
    payment_status              VARCHAR(40) NOT NULL DEFAULT 'PENDING_PAYMENT',
    cod_amount                  NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status                      VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    failed_attempt_count        INTEGER NOT NULL DEFAULT 0,
    delivery_instructions       VARCHAR(1000),
    cancellation_reason         VARCHAR(500),
    assigned_courier_id         VARCHAR(100),
    assigned_courier_name       VARCHAR(200),
    assigned_courier_phone      VARCHAR(50),
    assigned_courier_vehicle    VARCHAR(100),
    recipient_confirmed_name    VARCHAR(200),
    signature_reference         VARCHAR(500),
    photo_evidence_url          VARCHAR(500),
    delivered_at                TIMESTAMP,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_tracking ON delivery_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer ON delivery_orders(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_merchant_org ON delivery_orders(merchant_organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_origin_branch ON delivery_orders(origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_dest_branch ON delivery_orders(destination_branch_id);

CREATE TABLE IF NOT EXISTS parcels (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL UNIQUE REFERENCES delivery_orders(id) ON DELETE CASCADE,
    description     VARCHAR(500) NOT NULL,
    parcel_size     VARCHAR(30) NOT NULL,
    weight_kg       NUMERIC(8, 2) NOT NULL,
    fragile         BOOLEAN NOT NULL DEFAULT FALSE,
    declared_value  NUMERIC(10, 2),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parcels_order_id ON parcels(order_id);

CREATE TABLE IF NOT EXISTS tracking_events (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL,
    location        VARCHAR(255),
    description     VARCHAR(1000) NOT NULL,
    actor_id        VARCHAR(100),
    actor_role      VARCHAR(50),
    recorded_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON tracking_events(order_id);

CREATE TABLE IF NOT EXISTS payment_references (
    id                          BIGSERIAL PRIMARY KEY,
    order_id                    BIGINT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    payment_method              VARCHAR(30) NOT NULL,
    payment_status              VARCHAR(40) NOT NULL,
    delivery_fee_amount         NUMERIC(10, 2) NOT NULL,
    cod_collection_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency                    VARCHAR(10) NOT NULL DEFAULT 'LKR',
    gateway_provider            VARCHAR(50),
    external_transaction_ref    VARCHAR(120),
    verified                    BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at                 TIMESTAMP,
    notes                       VARCHAR(500),
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_references_order_id ON payment_references(order_id);
