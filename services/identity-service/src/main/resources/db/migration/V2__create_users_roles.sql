-- ============================================================
-- SwiftDrop Identity Service - V2: User Authentication Schema
-- Creates users, roles, and user_role join tables
-- ============================================================

-- Auth provider enum type
CREATE TYPE auth_provider AS ENUM ('LOCAL', 'GOOGLE');

-- Account status enum type
CREATE TYPE account_status AS ENUM ('ACTIVE', 'DISABLED', 'SUSPENDED', 'PENDING_VERIFICATION');

-- ============================================================
-- ROLES table
-- ============================================================
CREATE TABLE roles (
    role_id   BIGSERIAL    PRIMARY KEY,
    role_name VARCHAR(50)  NOT NULL UNIQUE
);

CREATE INDEX idx_roles_role_name ON roles (role_name);

-- ============================================================
-- USERS table
-- ============================================================
CREATE TABLE users (
    user_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        VARCHAR(150)  NOT NULL,
    email            VARCHAR(255)  NOT NULL UNIQUE,
    password_hash    VARCHAR(255)  NULL,           -- nullable for OAuth-only accounts
    phone            VARCHAR(20)   NULL,
    account_status   account_status NOT NULL DEFAULT 'ACTIVE',
    auth_provider    auth_provider  NOT NULL DEFAULT 'LOCAL',
    provider_user_id VARCHAR(255)  NULL,           -- Google sub or similar
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_account_status ON users (account_status);
CREATE INDEX idx_users_auth_provider ON users (auth_provider);
CREATE UNIQUE INDEX idx_users_provider_user_id ON users (auth_provider, provider_user_id)
    WHERE provider_user_id IS NOT NULL;

-- ============================================================
-- USER_ROLES join table
-- ============================================================
CREATE TABLE user_roles (
    user_id UUID   NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles (role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- ============================================================
-- REFRESH TOKENS table
-- Supports secure token rotation and revocation
-- ============================================================
CREATE TABLE refresh_tokens (
    token_id    BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,   -- store SHA-256 hash of the raw token
    expires_at  TIMESTAMP    NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id   ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

