-- =============================================================================
-- V13: Extend merchant_applications lifecycle fields & create merchant_documents
-- =============================================================================

ALTER TABLE merchant_applications
    ADD COLUMN IF NOT EXISTS business_type            VARCHAR(100),
    ADD COLUMN IF NOT EXISTS business_description     VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS website                  VARCHAR(300),
    ADD COLUMN IF NOT EXISTS alternative_phone        VARCHAR(50),
    ADD COLUMN IF NOT EXISTS province                 VARCHAR(150),
    ADD COLUMN IF NOT EXISTS product_types            VARCHAR(500),
    ADD COLUMN IF NOT EXISTS expected_pickup_locations VARCHAR(500),
    ADD COLUMN IF NOT EXISTS additional_notes         VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS info_request_message     VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS suspension_reason        VARCHAR(1000);

CREATE TABLE IF NOT EXISTS merchant_documents (
    id                  BIGSERIAL PRIMARY KEY,
    application_id      BIGINT       NOT NULL REFERENCES merchant_applications(id) ON DELETE CASCADE,
    document_type       VARCHAR(60)  NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    content_type        VARCHAR(120) NOT NULL,
    file_size_bytes     BIGINT       NOT NULL,
    content             BYTEA        NOT NULL,
    verification_status VARCHAR(40)  NOT NULL DEFAULT 'SUBMITTED',
    uploaded_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_documents_app_id ON merchant_documents (application_id);
