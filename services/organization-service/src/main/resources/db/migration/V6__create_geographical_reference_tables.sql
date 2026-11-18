-- ============================================================
-- SwiftDrop Organization Service - Sri Lankan Geographical Reference Data
-- Administrative Divisions (Province, District, DS Division, GN Division)
-- and Canonical Postal Areas (unique 5-digit postal_code)
-- ============================================================

CREATE TABLE provinces (
    id         BIGSERIAL        PRIMARY KEY,
    code       VARCHAR(20)      NOT NULL,
    name       VARCHAR(120)     NOT NULL,
    latitude   DOUBLE PRECISION,
    longitude  DOUBLE PRECISION,
    created_at TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_provinces_code UNIQUE (code)
);

CREATE TABLE districts (
    id          BIGSERIAL        PRIMARY KEY,
    code        VARCHAR(20)      NOT NULL,
    province_id BIGINT           NOT NULL REFERENCES provinces (id),
    name        VARCHAR(120)     NOT NULL,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_districts_code UNIQUE (code)
);

CREATE INDEX idx_districts_province_id ON districts (province_id);

CREATE TABLE ds_divisions (
    id          BIGSERIAL        PRIMARY KEY,
    code        VARCHAR(30)      NOT NULL,
    district_id BIGINT           NOT NULL REFERENCES districts (id),
    name        VARCHAR(150)     NOT NULL,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_ds_divisions_code UNIQUE (code)
);

CREATE INDEX idx_ds_divisions_district_id ON ds_divisions (district_id);

CREATE TABLE postal_areas (
    id               BIGSERIAL        PRIMARY KEY,
    postal_code      VARCHAR(5)       NOT NULL,
    area_name        VARCHAR(200)     NOT NULL,
    province_id      BIGINT           NOT NULL REFERENCES provinces (id),
    district_id      BIGINT           NOT NULL REFERENCES districts (id),
    ds_division_id   BIGINT           REFERENCES ds_divisions (id),
    latitude         DOUBLE PRECISION,
    longitude        DOUBLE PRECISION,
    is_active        BOOLEAN          NOT NULL DEFAULT TRUE,
    source_name      VARCHAR(120)     NOT NULL,
    source_reference VARCHAR(120)     NOT NULL,
    import_version   VARCHAR(50)      NOT NULL,
    created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_postal_areas_postal_code UNIQUE (postal_code),
    CONSTRAINT chk_postal_areas_code_length CHECK (CHAR_LENGTH(postal_code) = 5)
);

CREATE INDEX idx_postal_areas_province_id ON postal_areas (province_id);
CREATE INDEX idx_postal_areas_district_id ON postal_areas (district_id);
CREATE INDEX idx_postal_areas_ds_division_id ON postal_areas (ds_division_id);
CREATE INDEX idx_postal_areas_is_active ON postal_areas (is_active);

CREATE TABLE gn_divisions (
    id             BIGSERIAL        PRIMARY KEY,
    code           VARCHAR(30)      NOT NULL,
    ds_division_id BIGINT           NOT NULL REFERENCES ds_divisions (id),
    name           VARCHAR(150)     NOT NULL,
    postal_code    VARCHAR(5),
    postal_area_id BIGINT           REFERENCES postal_areas (id),
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_gn_divisions_code UNIQUE (code)
);

CREATE INDEX idx_gn_divisions_ds_division_id ON gn_divisions (ds_division_id);
CREATE INDEX idx_gn_divisions_postal_area_id ON gn_divisions (postal_area_id);
