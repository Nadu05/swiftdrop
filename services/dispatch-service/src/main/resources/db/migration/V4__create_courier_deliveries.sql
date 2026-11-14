-- ============================================================
-- SwiftDrop Dispatch Service - Schema Migration V4
-- Feature: Courier portal (Member 08 courier UI backend)
-- Table: courier_deliveries
--
-- One row per assignment with what the courier needs to work the
-- job, kept separate from the assignments table so the dispatcher
-- assignment domain (V2/V3) is not changed.
-- Status changes stay in assignments via PATCH /assignments/{id}/status:
--   * an order snapshot (recipient, pickup, parcel). The Order
--     service owns the order; Dispatch keeps only the minimum copy it
--     needs, filled when the assignment is created.
--   * operational facts recorded by the courier: pickup time,
--     completion time, proof of delivery, failure reason.
-- Proof of delivery stores references only, never media.
-- ------------------------------------------------------------
CREATE TABLE courier_deliveries (
    id                    BIGSERIAL      PRIMARY KEY,
    assignment_id         BIGINT         NOT NULL,

    -- Order snapshot (copied from Order service at assignment time)
    tracking_number       VARCHAR(50),
    priority              VARCHAR(20),
    recipient_name        VARCHAR(255),
    recipient_phone       VARCHAR(50),
    delivery_address      VARCHAR(500),
    delivery_city         VARCHAR(255),
    pickup_name           VARCHAR(255),
    pickup_phone          VARCHAR(50),
    pickup_address        VARCHAR(500),
    pickup_city           VARCHAR(255),
    package_type          VARCHAR(50),
    weight_kg             NUMERIC(8, 2),
    handling_notes        VARCHAR(1000),
    payout_amount         NUMERIC(10, 2),

    -- Operational facts recorded by the courier
    picked_up_at          TIMESTAMP WITH TIME ZONE,
    completed_at          TIMESTAMP WITH TIME ZONE,
    pod_type              VARCHAR(20),
    pod_received_by       VARCHAR(120),
    pod_reference         VARCHAR(100),
    failure_reason        VARCHAR(100),
    failure_notes         VARCHAR(500),

    version               BIGINT         NOT NULL DEFAULT 0,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_courier_deliveries_assignment UNIQUE (assignment_id),
    CONSTRAINT fk_courier_deliveries_assignment FOREIGN KEY (assignment_id)
        REFERENCES assignments (id) ON DELETE RESTRICT,
    CONSTRAINT chk_courier_deliveries_pod_type CHECK (pod_type IS NULL OR pod_type IN ('OTP', 'SIGNATURE', 'PHOTO')),
    CONSTRAINT chk_courier_deliveries_weight CHECK (weight_kg IS NULL OR weight_kg >= 0),
    CONSTRAINT chk_courier_deliveries_payout CHECK (payout_amount IS NULL OR payout_amount >= 0)
);
