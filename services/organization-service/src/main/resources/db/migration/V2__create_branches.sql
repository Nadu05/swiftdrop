-- ============================================================
-- SwiftDrop Organization Service - Branch Management Schema
-- Phase 1: Branches table for branch CRUD operations
-- ============================================================

CREATE TABLE branches (
    id            BIGSERIAL       PRIMARY KEY,
    code          VARCHAR(50)     NOT NULL,
    name          VARCHAR(255)    NOT NULL,
    address_line1 VARCHAR(500)    NOT NULL,
    address_line2 VARCHAR(500),
    city          VARCHAR(255)    NOT NULL,
    phone         VARCHAR(50)     NOT NULL,
    email         VARCHAR(255),
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    status        VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_branches_code UNIQUE (code),
    CONSTRAINT chk_branches_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT chk_branches_longitude CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT chk_branches_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_branches_status ON branches (status);
CREATE INDEX idx_branches_city ON branches (city);

