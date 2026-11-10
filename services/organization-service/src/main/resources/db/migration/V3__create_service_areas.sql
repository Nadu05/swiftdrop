-- ============================================================
-- SwiftDrop Organization Service - Service Area Management Schema
-- Phase 2: Service Areas table for branch geographic coverage
-- ============================================================

CREATE TABLE service_areas (
    id               BIGSERIAL        PRIMARY KEY,
    branch_id        BIGINT           NOT NULL,
    area_name        VARCHAR(255)     NOT NULL,
    center_latitude  DOUBLE PRECISION NOT NULL,
    center_longitude DOUBLE PRECISION NOT NULL,
    max_radius_km    NUMERIC(10, 2)   NOT NULL,
    status           VARCHAR(20)      NOT NULL DEFAULT 'ACTIVE',
    created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_areas_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE RESTRICT,
    CONSTRAINT chk_service_areas_latitude CHECK (center_latitude >= -90 AND center_latitude <= 90),
    CONSTRAINT chk_service_areas_longitude CHECK (center_longitude >= -180 AND center_longitude <= 180),
    CONSTRAINT chk_service_areas_radius CHECK (max_radius_km > 0),
    CONSTRAINT chk_service_areas_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_service_areas_branch_id ON service_areas (branch_id);
CREATE INDEX idx_service_areas_status ON service_areas (status);

