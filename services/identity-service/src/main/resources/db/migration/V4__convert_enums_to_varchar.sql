-- ============================================================
-- SwiftDrop Identity Service - V4: Convert Custom Enums to VARCHAR
-- Resolves PostgreSQL JDBC type mismatch with Hibernate EnumType.STRING
-- ============================================================

ALTER TABLE users 
    ALTER COLUMN account_status DROP DEFAULT,
    ALTER COLUMN account_status TYPE VARCHAR(30) USING account_status::text,
    ALTER COLUMN account_status SET DEFAULT 'ACTIVE';

ALTER TABLE users 
    ALTER COLUMN auth_provider DROP DEFAULT,
    ALTER COLUMN auth_provider TYPE VARCHAR(20) USING auth_provider::text,
    ALTER COLUMN auth_provider SET DEFAULT 'LOCAL';

DROP TYPE IF EXISTS account_status;
DROP TYPE IF EXISTS auth_provider;

