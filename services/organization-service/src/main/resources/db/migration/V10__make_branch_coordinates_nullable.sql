-- ============================================================
-- SwiftDrop Organization Service - Make branch coordinates nullable
-- Latitude and longitude are no longer required during branch creation.
-- ============================================================

ALTER TABLE branches ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE branches ALTER COLUMN longitude DROP NOT NULL;

