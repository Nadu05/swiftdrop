-- =============================================================================
-- V7: Track must_change_password and temporary_password on users for
--     admin-provisioned / reset Branch Manager temporary credentials
-- =============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS temporary_password VARCHAR(255) NULL;
