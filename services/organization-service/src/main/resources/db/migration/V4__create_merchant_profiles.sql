-- ============================================================
-- SwiftDrop Organization Service - Merchant Profiles Schema
-- Phase 3: Merchant organization registration and approval
--
-- identity_user_id is an external reference to an Identity Service
-- user. There is intentionally NO foreign key (separate database per
-- service). No credentials or tokens are stored in this table.
-- ============================================================

CREATE TABLE merchant_profiles (
    id                           BIGSERIAL     PRIMARY KEY,
    identity_user_id             VARCHAR(100),
    business_name                VARCHAR(255)  NOT NULL,
    business_registration_number VARCHAR(50)   NOT NULL,
    business_type                VARCHAR(30)   NOT NULL,
    contact_person_name          VARCHAR(255)  NOT NULL,
    contact_email                VARCHAR(255)  NOT NULL,
    contact_phone                VARCHAR(50)   NOT NULL,
    business_address_line1       VARCHAR(500)  NOT NULL,
    business_address_line2       VARCHAR(500),
    city                         VARCHAR(255)  NOT NULL,
    status                       VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    rejection_reason             VARCHAR(1000),
    suspension_reason            VARCHAR(1000),
    reviewed_by                  VARCHAR(100),
    reviewed_at                  TIMESTAMP,
    version                      BIGINT        NOT NULL DEFAULT 0,
    created_at                   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraints also create the B-tree indexes used for lookups
    -- by registration number and identity user ID.
    CONSTRAINT uq_merchant_profiles_registration_number UNIQUE (business_registration_number),
    CONSTRAINT uq_merchant_profiles_identity_user_id UNIQUE (identity_user_id),
    CONSTRAINT chk_merchant_profiles_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    CONSTRAINT chk_merchant_profiles_business_type
        CHECK (business_type IN ('GROCERY_FOOD', 'PHARMACY', 'RETAIL', 'OTHER'))
);

CREATE INDEX idx_merchant_profiles_status ON merchant_profiles (status);

