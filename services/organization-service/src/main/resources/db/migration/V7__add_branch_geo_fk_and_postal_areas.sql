-- ============================================================
-- SwiftDrop Organization Service - Branch Geo FKs & Exclusive Postal Area Coverage
-- ============================================================

ALTER TABLE branches ADD COLUMN province_id BIGINT REFERENCES provinces (id);
ALTER TABLE branches ADD COLUMN district_id BIGINT REFERENCES districts (id);
ALTER TABLE branches ADD COLUMN ds_division_id BIGINT REFERENCES ds_divisions (id);
ALTER TABLE branches ADD COLUMN postal_code VARCHAR(5);

CREATE INDEX idx_branches_province_id ON branches (province_id);
CREATE INDEX idx_branches_district_id ON branches (district_id);
CREATE INDEX idx_branches_ds_division_id ON branches (ds_division_id);
CREATE INDEX idx_branches_postal_code ON branches (postal_code);

CREATE TABLE branch_postal_areas (
    id             BIGSERIAL    PRIMARY KEY,
    branch_id      BIGINT       NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
    postal_area_id BIGINT       NOT NULL REFERENCES postal_areas (id),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    assigned_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by    VARCHAR(255) NOT NULL,
    unassigned_at  TIMESTAMP,
    unassigned_by  VARCHAR(255)
);

CREATE INDEX idx_branch_postal_areas_branch_id ON branch_postal_areas (branch_id);
CREATE INDEX idx_branch_postal_areas_postal_area_id ON branch_postal_areas (postal_area_id);
-- Note: PostgreSQL partial unique index (WHERE is_active = TRUE) is applied in db/postgresql/V8__branch_postal_areas_partial_unique_index.sql
