-- ============================================================
-- SwiftDrop Order Service - V2 Core Order Domain Schema
-- Entities: PricingQuote, DeliveryOrder, Parcel, TrackingEvent, PaymentReference
-- ============================================================

CREATE TABLE pricing_quotes (
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

CREATE INDEX idx_pricing_quotes_ref ON pricing_quotes(quote_reference);

CREATE TABLE delivery_orders (
    id                          BIGSERIAL PRIMARY KEY,
    tracking_number             VARCHAR(32) NOT NULL UNIQUE,
    order_source_type           VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
    customer_user_id            VARCHAR(100),
    customer_email              VARCHAR(255),
    merchant_organization_id    VARCHAR(100),
    pickup_method               VARCHAR(30) NOT NULL DEFAULT 'COURIER_PICKUP',

    -- Embedded DeliveryAddress: pickupDetails
    pickup_address              VARCHAR(500) NOT NULL,
    pickup_city                 VARCHAR(120),
    pickup_postal_code          VARCHAR(30),
    pickup_latitude             DOUBLE PRECISION NOT NULL,
    pickup_longitude            DOUBLE PRECISION NOT NULL,
    pickup_contact_name         VARCHAR(200) NOT NULL,
    pickup_contact_phone        VARCHAR(50) NOT NULL,
    pickup_contact_email        VARCHAR(255),

    -- Embedded DeliveryAddress: dropoffDetails
    dropoff_address             VARCHAR(500) NOT NULL,
    dropoff_city                VARCHAR(120),
    dropoff_postal_code         VARCHAR(30),
    destination_latitude        DOUBLE PRECISION NOT NULL,
    destination_longitude       DOUBLE PRECISION NOT NULL,
    dropoff_contact_name        VARCHAR(200) NOT NULL,
    dropoff_contact_phone       VARCHAR(50) NOT NULL,
    dropoff_contact_email       VARCHAR(255),

    -- Resolved Organization Service Branches
    origin_branch_id            BIGINT NOT NULL,
    origin_branch_code          VARCHAR(50) NOT NULL,
    origin_branch_name          VARCHAR(200) NOT NULL,
    destination_branch_id       BIGINT NOT NULL,
    destination_branch_code     VARCHAR(50) NOT NULL,
    destination_branch_name     VARCHAR(200) NOT NULL,
    same_branch                 BOOLEAN NOT NULL DEFAULT FALSE,
    distance_km                 NUMERIC(8, 2) NOT NULL,

    -- Agreed Pricing Breakdown
    quote_reference             VARCHAR(64),
    base_fee                    NUMERIC(10, 2) NOT NULL,
    distance_fee                NUMERIC(10, 2) NOT NULL,
    weight_fee                  NUMERIC(10, 2) NOT NULL,
    size_surcharge              NUMERIC(10, 2) NOT NULL,
    delivery_fee                NUMERIC(10, 2) NOT NULL,
    currency                    VARCHAR(10) NOT NULL DEFAULT 'LKR',

    -- Payment & COD Separation (BD-01)
    payment_method              VARCHAR(30) NOT NULL DEFAULT 'PREPAID',
    payment_status              VARCHAR(40) NOT NULL DEFAULT 'PENDING_PAYMENT',
    cod_amount                  NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    -- Lifecycle & Retry Tracking (BD-02, BD-07)
    status                      VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    failed_attempt_count        INTEGER NOT NULL DEFAULT 0,
    delivery_instructions       VARCHAR(1000),
    cancellation_reason         VARCHAR(500),

    -- Courier Assignment Summary (from Dispatch Service)
    assigned_courier_id         VARCHAR(100),
    assigned_courier_name       VARCHAR(200),
    assigned_courier_phone      VARCHAR(50),
    assigned_courier_vehicle    VARCHAR(100),

    -- Delivery Proof (BD-08)
    recipient_confirmed_name    VARCHAR(200),
    signature_reference         VARCHAR(500),
    photo_evidence_url          VARCHAR(500),
    delivered_at                TIMESTAMP,

    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_orders_tracking ON delivery_orders(tracking_number);
CREATE INDEX idx_delivery_orders_customer ON delivery_orders(customer_user_id);
CREATE INDEX idx_delivery_orders_merchant_org ON delivery_orders(merchant_organization_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_orders_origin_branch ON delivery_orders(origin_branch_id);
CREATE INDEX idx_delivery_orders_dest_branch ON delivery_orders(destination_branch_id);

CREATE TABLE parcels (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL UNIQUE REFERENCES delivery_orders(id) ON DELETE CASCADE,
    description     VARCHAR(500) NOT NULL,
    parcel_size     VARCHAR(30) NOT NULL,
    weight_kg       NUMERIC(8, 2) NOT NULL,
    fragile         BOOLEAN NOT NULL DEFAULT FALSE,
    declared_value  NUMERIC(10, 2),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parcels_order_id ON parcels(order_id);

CREATE TABLE tracking_events (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL,
    location        VARCHAR(255),
    description     VARCHAR(1000) NOT NULL,
    actor_id        VARCHAR(100),
    actor_role      VARCHAR(50),
    recorded_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracking_events_order_id ON tracking_events(order_id);

CREATE TABLE payment_references (
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

CREATE INDEX idx_payment_references_order_id ON payment_references(order_id);

