-- =============================================================================
-- V5__ensure_dispatch_schema_alignment.sql
-- Ensures Neon cloud databases that had an earlier pre-refactor V2/V3 applied
-- are aligned with the canonical V2/V3 Dispatch domain schema.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'courier_assignment_history'
    ) THEN
        DROP TABLE IF EXISTS
            parcel_custody_records,
            return_tasks,
            transfer_manifest_parcels,
            transfer_manifests,
            delivery_exceptions,
            proofs_of_delivery,
            delivery_attempts,
            courier_assignment_history,
            courier_assignments,
            delivery_jobs,
            pickup_tasks,
            couriers
        CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS couriers (
    id BIGSERIAL PRIMARY KEY,
    courier_code VARCHAR(32) NOT NULL UNIQUE,
    user_id VARCHAR(120) UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    vehicle_type VARCHAR(30) NOT NULL,
    vehicle_plate VARCHAR(40) NOT NULL,
    branch_id BIGINT NOT NULL,
    branch_code VARCHAR(32) NOT NULL,
    branch_name VARCHAR(150) NOT NULL,
    zone VARCHAR(120) NOT NULL,
    availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    max_capacity INT NOT NULL DEFAULT 8,
    completed_today INT NOT NULL DEFAULT 0,
    total_completed_lifetime INT NOT NULL DEFAULT 0,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.80,
    shift_start VARCHAR(40) DEFAULT '08:00 AM',
    last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_couriers_branch_id ON couriers(branch_id);
CREATE INDEX IF NOT EXISTS idx_couriers_status ON couriers(availability_status);

CREATE TABLE IF NOT EXISTS pickup_tasks (
    id BIGSERIAL PRIMARY KEY,
    task_code VARCHAR(32) NOT NULL UNIQUE,
    order_id VARCHAR(64) NOT NULL UNIQUE,
    tracking_number VARCHAR(32) NOT NULL UNIQUE,
    pickup_method VARCHAR(30) NOT NULL,
    status VARCHAR(40) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    origin_branch_id BIGINT NOT NULL,
    origin_branch_code VARCHAR(32) NOT NULL,
    origin_branch_name VARCHAR(150) NOT NULL,
    destination_branch_id BIGINT NOT NULL,
    destination_branch_code VARCHAR(32) NOT NULL,
    destination_branch_name VARCHAR(150) NOT NULL,
    same_branch BOOLEAN NOT NULL DEFAULT FALSE,
    merchant_name VARCHAR(180),
    sender_name VARCHAR(150) NOT NULL,
    sender_phone VARCHAR(40) NOT NULL,
    pickup_address VARCHAR(500) NOT NULL,
    pickup_city VARCHAR(100),
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(40) NOT NULL,
    dropoff_address VARCHAR(500) NOT NULL,
    dropoff_city VARCHAR(100),
    parcel_category VARCHAR(150) NOT NULL,
    parcel_size VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
    weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    fragile BOOLEAN NOT NULL DEFAULT FALSE,
    handling_notes VARCHAR(1000),
    distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) DEFAULT 'PREPAID',
    cod_amount NUMERIC(12, 2) DEFAULT 0.00,
    assigned_courier_id BIGINT,
    assigned_courier_code VARCHAR(32),
    assigned_courier_name VARCHAR(150),
    parcel_reference VARCHAR(64),
    branch_confirmed_by_employee_id VARCHAR(120),
    branch_confirmed_by_employee_name VARCHAR(150),
    branch_confirmed_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pickup_tasks_origin_branch ON pickup_tasks(origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_pickup_tasks_status ON pickup_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pickup_tasks_courier ON pickup_tasks(assigned_courier_id);

CREATE TABLE IF NOT EXISTS delivery_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_code VARCHAR(32) NOT NULL UNIQUE,
    order_id VARCHAR(64) NOT NULL UNIQUE,
    tracking_number VARCHAR(32) NOT NULL UNIQUE,
    status VARCHAR(40) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    branch_id BIGINT NOT NULL,
    branch_code VARCHAR(32) NOT NULL,
    branch_name VARCHAR(150) NOT NULL,
    origin_branch_id BIGINT NOT NULL,
    origin_branch_code VARCHAR(32) NOT NULL,
    origin_branch_name VARCHAR(150) NOT NULL,
    destination_branch_id BIGINT NOT NULL,
    destination_branch_code VARCHAR(32) NOT NULL,
    destination_branch_name VARCHAR(150) NOT NULL,
    merchant_name VARCHAR(180),
    merchant_contact VARCHAR(80),
    sender_name VARCHAR(150) NOT NULL,
    sender_phone VARCHAR(40) NOT NULL,
    pickup_address VARCHAR(500) NOT NULL,
    pickup_city VARCHAR(100),
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(40) NOT NULL,
    delivery_address VARCHAR(500) NOT NULL,
    delivery_city VARCHAR(100),
    parcel_category VARCHAR(150) NOT NULL,
    parcel_size VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
    weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    dimensions VARCHAR(80),
    handling_notes VARCHAR(1000),
    distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payout_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) DEFAULT 'PREPAID',
    cod_amount NUMERIC(12, 2) DEFAULT 0.00,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    assigned_courier_id BIGINT,
    assigned_courier_code VARCHAR(32),
    assigned_courier_name VARCHAR(150),
    assigned_courier_phone VARCHAR(40),
    assigned_courier_vehicle VARCHAR(30),
    assigned_at TIMESTAMP,
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_branch ON delivery_jobs(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_courier ON delivery_jobs(assigned_courier_id);

CREATE TABLE IF NOT EXISTS transfer_manifests (
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

CREATE INDEX IF NOT EXISTS idx_transfer_manifests_origin ON transfer_manifests(origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfer_manifests_destination ON transfer_manifests(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfer_manifests_status ON transfer_manifests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_manifests_courier ON transfer_manifests(assigned_courier_id);

CREATE TABLE IF NOT EXISTS transfer_manifest_parcels (
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

CREATE INDEX IF NOT EXISTS idx_tmp_manifest ON transfer_manifest_parcels(manifest_id);
CREATE INDEX IF NOT EXISTS idx_tmp_order ON transfer_manifest_parcels(order_id);
CREATE INDEX IF NOT EXISTS idx_tmp_tracking ON transfer_manifest_parcels(tracking_number);
CREATE INDEX IF NOT EXISTS idx_tmp_status ON transfer_manifest_parcels(status);

CREATE TABLE IF NOT EXISTS delivery_exceptions (
    id BIGSERIAL PRIMARY KEY,
    exception_code VARCHAR(32) NOT NULL UNIQUE,
    delivery_job_id BIGINT REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL,
    tracking_number VARCHAR(32) NOT NULL,
    branch_id BIGINT NOT NULL,
    branch_code VARCHAR(32) NOT NULL,
    branch_name VARCHAR(150) NOT NULL,
    exception_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_DECISION',
    failed_attempt_count INT NOT NULL DEFAULT 3,
    last_failure_reason VARCHAR(250),
    decision_action VARCHAR(50),
    decision_reason VARCHAR(1000),
    decided_by_id VARCHAR(120),
    decided_by_name VARCHAR(150),
    decided_by_role VARCHAR(40),
    decided_at TIMESTAMP,
    transfer_manifest_id BIGINT REFERENCES transfer_manifests(id) ON DELETE SET NULL,
    manifest_code VARCHAR(32),
    pickup_task_id BIGINT REFERENCES pickup_tasks(id) ON DELETE SET NULL,
    return_task_id BIGINT,
    parcel_reference VARCHAR(64),
    description VARCHAR(1500),
    responsible_user_id VARCHAR(120),
    responsible_user_name VARCHAR(150),
    responsible_user_role VARCHAR(40),
    evidence_reference VARCHAR(1000),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolution_notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exceptions_branch_status ON delivery_exceptions(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_exceptions_job ON delivery_exceptions(delivery_job_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_manifest ON delivery_exceptions(transfer_manifest_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_type ON delivery_exceptions(exception_type);
CREATE INDEX IF NOT EXISTS idx_exceptions_tracking ON delivery_exceptions(tracking_number);

CREATE TABLE IF NOT EXISTS return_tasks (
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

CREATE INDEX IF NOT EXISTS idx_return_tasks_order ON return_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_return_tasks_tracking ON return_tasks(tracking_number);
CREATE INDEX IF NOT EXISTS idx_return_tasks_status ON return_tasks(status);
CREATE INDEX IF NOT EXISTS idx_return_tasks_branch ON return_tasks(current_branch_id);
CREATE INDEX IF NOT EXISTS idx_return_tasks_courier ON return_tasks(assigned_courier_id);

CREATE TABLE IF NOT EXISTS courier_assignments (
    id BIGSERIAL PRIMARY KEY,
    assignment_code VARCHAR(32) NOT NULL UNIQUE,
    task_type VARCHAR(20) NOT NULL,
    pickup_task_id BIGINT REFERENCES pickup_tasks(id) ON DELETE CASCADE,
    delivery_job_id BIGINT REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    transfer_manifest_id BIGINT REFERENCES transfer_manifests(id) ON DELETE CASCADE,
    return_task_id BIGINT REFERENCES return_tasks(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL,
    tracking_number VARCHAR(32) NOT NULL,
    branch_id BIGINT NOT NULL,
    branch_code VARCHAR(32) NOT NULL,
    branch_name VARCHAR(150) NOT NULL,
    courier_id BIGINT NOT NULL REFERENCES couriers(id),
    status VARCHAR(30) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    notes VARCHAR(1000),
    assigned_by_user_id VARCHAR(120),
    assigned_by_name VARCHAR(150),
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courier_assignments_courier ON courier_assignments(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_branch ON courier_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_status ON courier_assignments(status);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_order ON courier_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_manifest ON courier_assignments(transfer_manifest_id);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_return ON courier_assignments(return_task_id);

CREATE TABLE IF NOT EXISTS courier_assignment_history (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES courier_assignments(id) ON DELETE CASCADE,
    from_courier_id BIGINT,
    from_courier_name VARCHAR(150),
    to_courier_id BIGINT NOT NULL,
    to_courier_name VARCHAR(150) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    assigned_by VARCHAR(150) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignment_history_assignment ON courier_assignment_history(assignment_id);

CREATE TABLE IF NOT EXISTS delivery_attempts (
    id BIGSERIAL PRIMARY KEY,
    delivery_job_id BIGINT NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    assignment_id BIGINT REFERENCES courier_assignments(id) ON DELETE SET NULL,
    order_id VARCHAR(64) NOT NULL,
    tracking_number VARCHAR(32) NOT NULL,
    attempt_number INT NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(200),
    notes VARCHAR(1000),
    courier_id BIGINT NOT NULL,
    courier_code VARCHAR(32),
    courier_name VARCHAR(150) NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_job ON delivery_attempts(delivery_job_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_order ON delivery_attempts(order_id);

CREATE TABLE IF NOT EXISTS proofs_of_delivery (
    id BIGSERIAL PRIMARY KEY,
    delivery_job_id BIGINT NOT NULL UNIQUE REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    assignment_id BIGINT REFERENCES courier_assignments(id) ON DELETE SET NULL,
    order_id VARCHAR(64) NOT NULL,
    tracking_number VARCHAR(32) NOT NULL,
    parcel_reference VARCHAR(64) NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    proof_type VARCHAR(20) NOT NULL,
    signature_reference VARCHAR(500),
    photo_evidence_reference VARCHAR(500),
    otp_reference VARCHAR(120),
    courier_id BIGINT NOT NULL,
    courier_code VARCHAR(32),
    courier_name VARCHAR(150) NOT NULL,
    delivered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pod_order ON proofs_of_delivery(order_id);
CREATE INDEX IF NOT EXISTS idx_pod_tracking ON proofs_of_delivery(tracking_number);

CREATE TABLE IF NOT EXISTS parcel_custody_records (
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

CREATE INDEX IF NOT EXISTS idx_custody_order ON parcel_custody_records(order_id);
CREATE INDEX IF NOT EXISTS idx_custody_tracking ON parcel_custody_records(tracking_number);
CREATE INDEX IF NOT EXISTS idx_custody_manifest ON parcel_custody_records(manifest_id);
CREATE INDEX IF NOT EXISTS idx_custody_return ON parcel_custody_records(return_task_id);

INSERT INTO couriers (
    courier_code, user_id, name, phone, email, vehicle_type, vehicle_plate,
    branch_id, branch_code, branch_name, zone, availability_status,
    max_capacity, completed_today, total_completed_lifetime, rating, shift_start
) VALUES
    ('CR-100', 'courier-100', 'Demo Courier (Colombo)', '+94 77 123 4560', 'courier@swiftdrop.lk', 'MOTORCYCLE', 'WP BDF-1000', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone A - Colombo Central', 'AVAILABLE', 10, 2, 540, 4.90, '08:00 AM'),
    ('CR-101', 'courier-101', 'Kamal Silva', '+94 77 123 4567', 'kamal.silva@swiftdrop.lk', 'MOTORCYCLE', 'WP BDF-8942', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone A - Colombo Central', 'AVAILABLE', 10, 4, 1240, 4.90, '07:30 AM'),
    ('CR-102', 'courier-102', 'Sunil Wickramasinghe', '+94 71 987 6543', 'sunil.w@swiftdrop.lk', 'VAN', 'WP CAS-4412', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone B - Colombo East', 'AVAILABLE', 10, 3, 980, 4.80, '08:00 AM'),
    ('CR-103', 'courier-103', 'Kasun Dias', '+94 72 333 8899', 'kasun.dias@swiftdrop.lk', 'MOTORCYCLE', 'WP BDE-1102', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone C - Colombo South', 'AVAILABLE', 8, 5, 850, 4.90, '08:15 AM'),
    ('CR-104', 'courier-104', 'Saman Kumara', '+94 75 444 1122', 'saman.k@swiftdrop.lk', 'BICYCLE', 'ECO-CYCLE-04', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone A - Colombo Central', 'AVAILABLE', 6, 2, 420, 4.70, '09:00 AM'),
    ('CR-105', 'courier-105', 'Mahesh Alwis', '+94 78 666 9900', 'mahesh.a@swiftdrop.lk', 'VAN', 'WP CAH-9988', 2, 'KDY-MAIN', 'Kandy Regional Hub', 'Zone K - Kandy City', 'AVAILABLE', 10, 3, 750, 4.80, '07:45 AM'),
    ('CR-106', 'courier-106', 'Pravin Weerakkody', '+94 70 111 2233', 'pravin.w@swiftdrop.lk', 'MOTORCYCLE', 'WP BDD-5566', 3, 'GAL-MAIN', 'Galle Southern Hub', 'Zone G - Galle Fort & South', 'OFFLINE', 8, 0, 310, 4.70, 'Off Shift')
ON CONFLICT (courier_code) DO NOTHING;
