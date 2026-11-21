-- =============================================================================
-- V6: Seed canonical enterprise roles (HEAD_OFFICE_ADMIN, BRANCH_MANAGER,
--     BRANCH_STAFF) and add branch_id / organization_id scope columns to users
-- =============================================================================

INSERT INTO roles (role_name) VALUES
    ('HEAD_OFFICE_ADMIN'),
    ('BRANCH_MANAGER'),
    ('BRANCH_STAFF')
ON CONFLICT (role_name) DO NOTHING;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS branch_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS organization_id VARCHAR(100) NULL;

CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users (branch_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users (organization_id);

