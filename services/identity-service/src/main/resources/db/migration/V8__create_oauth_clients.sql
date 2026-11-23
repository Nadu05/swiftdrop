-- =============================================================================
-- V8: OAuth 2.0 Client Credentials storage for Approved Merchants
-- =============================================================================

CREATE TABLE IF NOT EXISTS oauth_clients (
    id                  BIGSERIAL PRIMARY KEY,
    client_id           VARCHAR(120) NOT NULL UNIQUE,
    client_secret_hash  VARCHAR(255) NOT NULL,
    merchant_id         VARCHAR(100) NOT NULL,
    merchant_name       VARCHAR(255) NOT NULL,
    status              VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMP,
    last_used_at        TIMESTAMP,
    revoked_at          TIMESTAMP,
    revocation_reason   VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_merchant_id ON oauth_clients (merchant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_status ON oauth_clients (status);

CREATE TABLE IF NOT EXISTS oauth_client_scopes (
    client_pk_id  BIGINT       NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    scope         VARCHAR(100) NOT NULL,
    PRIMARY KEY (client_pk_id, scope)
);

CREATE TABLE IF NOT EXISTS oauth_credential_history (
    id            BIGSERIAL PRIMARY KEY,
    client_pk_id  BIGINT       NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    client_id     VARCHAR(120) NOT NULL,
    merchant_id   VARCHAR(100) NOT NULL,
    action        VARCHAR(50)  NOT NULL,
    performed_by  VARCHAR(255) NOT NULL,
    details       VARCHAR(1000),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_cred_history_merchant ON oauth_credential_history (merchant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_cred_history_client ON oauth_credential_history (client_pk_id);
