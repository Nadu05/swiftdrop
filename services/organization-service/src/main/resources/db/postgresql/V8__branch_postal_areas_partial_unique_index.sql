-- Enforce exclusive active Branch Coverage at the PostgreSQL database level
CREATE UNIQUE INDEX uq_branch_postal_areas_active_postal_area
    ON branch_postal_areas (postal_area_id)
    WHERE is_active = TRUE;
