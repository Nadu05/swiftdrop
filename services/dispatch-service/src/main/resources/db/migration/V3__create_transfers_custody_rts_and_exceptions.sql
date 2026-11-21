-- =============================================================================
-- V3__create_transfers_custody_rts_and_exceptions.sql
-- SwiftDrop Dispatch Service: Inter-Branch Transfer Manifests, Parcel Custody,
-- Operational Exceptions, and Return-to-Sender (RTS) Operations
-- =============================================================================

CREATE TABLE transfer_manifests (
    id BIGSERIAL PRIMARY KEY,
    manifest_code VARCHAR(32) NOT NULL UNIQUE,
    origin_branch_id BIGINT NOT NULL,
    origin_branch_code VARCHAR(32) NOT NULL,
    origin_branch_name VARCHAR(150) NOT NULL,
    destination_branch_id BIGINT NOT NULL,
    destination_branch_code VARCHAR(32) NOT NULL,
    destination_branch_name VARCHAR(150) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
    assigned_courier_id BIGINT REFERENCES couriers(id),
    assigned_courier_code VARCHAR(32),
    assigned_courier_name VARCHAR(150),
    vehicle_type VARCHAR(30),
    vehicle_plate VARCHAR(40),
    expected_parcel_count INT NOT NULL DEFAULT 0,
    received_parcel_count INT NOT NULL DEFAULT 0,
    missing_parcel_count INT NOT NULL DEFAULT 0,
    damaged_parcel_count INT NOT NULL DEFAULT 0,
    origin_handover_by_id VARCHAR(120),
    origin_handover_by_name VARCHAR(150),
    origin_handover_at TIMESTAMP,
    departure_at TIMESTAMP,
    arrival_at TIMESTAMP,
    destination_received_by_id VARCHAR(120),
    destination_received_by_name VARCHAR(150),
    destination_received_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes VARCHAR(1000),
    discrepancy_notes VARCHAR(1000),
    created_by_id VARCHAR(120),
    created_by_name VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transfer_manifests_origin ON transfer_manifests(origin_branch_id);
CREATE INDEX idx_transfer_manifests_destination ON transfer_manifests(destination_branch_id);
CREATE INDEX idx_transfer_manifests_status ON transfer_manifests(status);
CREATE INDEX idx_transfer_manifests_courier ON transfer_manifests(assigned_courier_id);

CREATE TABLE transfer_manifest_parcels (
    id BIGSERIAL PRIMARY KEY,
    manifest_id BIGINT NOT NULL REFERENCES transfer_manifests(id) ON DELETE CASCADE,
    pickup_task_id BIGINT REFERENCES pickup_tasks(id) ON DELETE SET NULL,
    order_id VARCHAR(64) NOT NULL,
    tracking_number VARCHAR(32) NOT NULL,
    parcel_reference VARCHAR(64) NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    parcel_category VARCHAR(150),
    status VARCHAR(40) NOT NULL DEFAULT 'MANIFESTED',
    discrepancy_notes VARCHAR(500),
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMP,
    received_at TIMESTAMP,
    CONSTRAINT uk_manifest_parcel_order UNIQUE (manifest_id, order_id)
);

CREATE INDEX idx_tmp_manifest ON transfer_manifest_parcels(manifest_id);
CREATE INDEX idx_tmp_order ON transfer_manifest_parcels(order_id);
CREATE INDEX idx_tmp_tracking ON transfer_manifest_parcels(tracking_number);
CREATE INDEX idx_tmp_status ON transfer_manifest_parcels(status);

ALTER TABLE delivery_exceptions
    ALTER COLUMN delivery_job_id DROP NOT NULL;

ALTER TABLE delivery_exceptions
    ADD COLUMN transfer_manifest_id BIGINT REFERENCES transfer_manifests(id) ON DELETE SET NULL,
    ADD COLUMN manifest_code VARCHAR(32),
    ADD COLUMN pickup_task_id BIGINT REFERENCES pickup_tasks(id) ON DELETE SET NULL,
    ADD COLUMN return_task_id BIGINT,
    ADD COLUMN parcel_reference VARCHAR(64),
    ADD COLUMN description VARCHAR(1500),
    ADD COLUMN responsible_user_id VARCHAR(120),
    ADD COLUMN responsible_user_name VARCHAR(150),
    ADD COLUMN responsible_user_role VARCHAR(40),
    ADD COLUMN evidence_reference VARCHAR(1000),
    ADD COLUMN reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN resolution_notes VARCHAR(1000);

CREATE INDEX idx_exceptions_manifest ON delivery_exceptions(transfer_manifest_id);
CREATE INDEX idx_exceptions_type ON delivery_exceptions(exception_type);
CREATE INDEX idx_exceptions_tracking ON delivery_exceptions(tracking_number);

CREATE TABLE return_tasks (
    id BIGSERIAL PRIMARY KEY,
    return_code VARCHAR(32) NOT NULL UNIQUE,
    order_id VARCHAR(64) NOT NULL,
    tracking_number VARCHAR(32) NOT NULL,
    parcel_reference VARCHAR(64),
    delivery_job_id BIGINT REFERENCES delivery_jobs(id) ON DELETE SET NULL,
    exception_id BIGINT REFERENCES delivery_exceptions(id) ON DELETE SET NULL,
    current_branch_id BIGINT NOT NULL,
    current_branch_code VARCHAR(32) NOT NULL,
    current_branch_name VARCHAR(150) NOT NULL,
    origin_branch_id BIGINT NOT NULL,
    origin_branch_code VARCHAR(32) NOT NULL,
    origin_branch_name VARCHAR(150) NOT NULL,
    return_to_name VARCHAR(150) NOT NULL,
    return_to_phone VARCHAR(40) NOT NULL,
    return_address VARCHAR(500) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    assigned_courier_id BIGINT REFERENCES couriers(id),
    assigned_courier_code VARCHAR(32),
    assigned_courier_name VARCHAR(150),
    return_manifest_id BIGINT REFERENCES transfer_manifests(id) ON DELETE SET NULL,
    movement_notes VARCHAR(1500),
    sender_confirmed_by VARCHAR(150),
    sender_confirmation_reference VARCHAR(500),
    initiated_by_id VARCHAR(120),
    initiated_by_name VARCHAR(150),
    initiated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    dispatched_at TIMESTAMP,
    arrived_origin_branch_at TIMESTAMP,
    returned_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_return_tasks_order ON return_tasks(order_id);
CREATE INDEX idx_return_tasks_tracking ON return_tasks(tracking_number);
CREATE INDEX idx_return_tasks_status ON return_tasks(status);
CREATE INDEX idx_return_tasks_branch ON return_tasks(current_branch_id);
CREATE INDEX idx_return_tasks_courier ON return_tasks(assigned_courier_id);

CREATE TABLE parcel_custody_records (
    id BIGSERIAL PRIMARY KEY,
    custody_code VARCHAR(32) NOT NULL UNIQUE,
    order_id VARCHAR(64) NOT NULL,
    tracking_number VARCHAR(32) NOT NULL,
    parcel_reference VARCHAR(64) NOT NULL,
    manifest_id BIGINT REFERENCES transfer_manifests(id) ON DELETE SET NULL,
    manifest_reference VARCHAR(32),
    return_task_id BIGINT REFERENCES return_tasks(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    responsible_branch_id BIGINT,
    responsible_branch_code VARCHAR(32),
    responsible_branch_name VARCHAR(150),
    responsible_courier_id BIGINT,
    responsible_courier_code VARCHAR(32),
    responsible_courier_name VARCHAR(150),
    responsible_employee_id VARCHAR(120),
    responsible_employee_name VARCHAR(150),
    handover_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discrepancy_notes VARCHAR(1000),
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_custody_order ON parcel_custody_records(order_id);
CREATE INDEX idx_custody_tracking ON parcel_custody_records(tracking_number);
CREATE INDEX idx_custody_manifest ON parcel_custody_records(manifest_id);
CREATE INDEX idx_custody_return ON parcel_custody_records(return_task_id);

ALTER TABLE courier_assignments
    ADD COLUMN transfer_manifest_id BIGINT REFERENCES transfer_manifests(id) ON DELETE CASCADE,
    ADD COLUMN return_task_id BIGINT REFERENCES return_tasks(id) ON DELETE CASCADE;

CREATE INDEX idx_courier_assignments_manifest ON courier_assignments(transfer_manifest_id);
CREATE INDEX idx_courier_assignments_return ON courier_assignments(return_task_id);

