-- ============================================================
-- SwiftDrop Identity Service - V3: Seed Roles
-- Inserts the five canonical SwiftDrop roles
-- ============================================================

INSERT INTO roles (role_name) VALUES
    ('CUSTOMER'),
    ('MERCHANT'),
    ('COURIER'),
    ('DISPATCHER'),
    ('ADMIN')
ON CONFLICT (role_name) DO NOTHING;

