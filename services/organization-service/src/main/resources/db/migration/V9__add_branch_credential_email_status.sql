-- ============================================================
-- SwiftDrop Organization Service - Branch Credential Email Delivery Tracking
-- ============================================================

ALTER TABLE branches
    ADD COLUMN credential_email_status VARCHAR(20),
    ADD COLUMN credential_email_sent_at TIMESTAMP,
    ADD COLUMN credential_email_error VARCHAR(500);

ALTER TABLE branches
    ADD CONSTRAINT chk_branches_credential_email_status
        CHECK (credential_email_status IS NULL OR credential_email_status IN ('PENDING', 'SENT', 'FAILED'));
