-- =============================================================================
-- SwiftDrop Local PostgreSQL Initialization Script
-- Automatically executes on container first startup in /docker-entrypoint-initdb.d/
-- Creates isolated databases for all 5 SwiftDrop microservices idempotently.
-- =============================================================================

SELECT 'CREATE DATABASE swiftdrop_identity'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swiftdrop_identity')\gexec

SELECT 'CREATE DATABASE swiftdrop_organization'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swiftdrop_organization')\gexec

SELECT 'CREATE DATABASE swiftdrop_order'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swiftdrop_order')\gexec

SELECT 'CREATE DATABASE swiftdrop_dispatch'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swiftdrop_dispatch')\gexec

SELECT 'CREATE DATABASE swiftdrop_notification'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swiftdrop_notification')\gexec

-- Grant full schema permissions to postgres user
GRANT ALL PRIVILEGES ON DATABASE swiftdrop_identity TO postgres;
GRANT ALL PRIVILEGES ON DATABASE swiftdrop_organization TO postgres;
GRANT ALL PRIVILEGES ON DATABASE swiftdrop_order TO postgres;
GRANT ALL PRIVILEGES ON DATABASE swiftdrop_dispatch TO postgres;
GRANT ALL PRIVILEGES ON DATABASE swiftdrop_notification TO postgres;
