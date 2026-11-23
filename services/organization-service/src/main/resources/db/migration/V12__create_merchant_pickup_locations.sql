-- V12__create_merchant_pickup_locations.sql
-- Saved pickup locations (warehouses, branches, fulfillment centers) for approved merchants

CREATE TABLE IF NOT EXISTS merchant_pickup_locations (
    id                       BIGSERIAL PRIMARY KEY,
    merchant_organization_id VARCHAR(64)  NOT NULL,
    location_name            VARCHAR(150) NOT NULL,
    contact_person           VARCHAR(150) NOT NULL,
    contact_phone            VARCHAR(32)  NOT NULL,
    address_line_1           VARCHAR(255) NOT NULL,
    address_line_2           VARCHAR(255),
    city                     VARCHAR(100) NOT NULL,
    district                 VARCHAR(100),
    postal_code              VARCHAR(20)  NOT NULL,
    pickup_instructions      VARCHAR(500),
    is_default               BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpl_merchant_org_id
    ON merchant_pickup_locations (merchant_organization_id);

CREATE INDEX IF NOT EXISTS idx_mpl_merchant_org_default
    ON merchant_pickup_locations (merchant_organization_id, is_default);

