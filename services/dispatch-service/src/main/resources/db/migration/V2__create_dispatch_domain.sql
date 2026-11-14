-- =============================================================================
-- V2__create_dispatch_domain.sql
-- SwiftDrop Dispatch Service Operational Domain Schema
-- Entities: CourierProfile, PickupTask, DeliveryJob, CourierAssignment,
--           AssignmentHistoryRecord, DeliveryAttempt, ProofOfDelivery, DeliveryException
-- =============================================================================

CREATE TABLE couriers (
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

CREATE INDEX idx_couriers_branch_id ON couriers(branch_id);
CREATE INDEX idx_couriers_status ON couriers(availability_status);

CREATE TABLE pickup_tasks (
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

CREATE INDEX idx_pickup_tasks_origin_branch ON pickup_tasks(origin_branch_id);
CREATE INDEX idx_pickup_tasks_status ON pickup_tasks(status);
CREATE INDEX idx_pickup_tasks_courier ON pickup_tasks(assigned_courier_id);

CREATE TABLE delivery_jobs (
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

CREATE INDEX idx_delivery_jobs_branch ON delivery_jobs(branch_id);
CREATE INDEX idx_delivery_jobs_status ON delivery_jobs(status);
CREATE INDEX idx_delivery_jobs_courier ON delivery_jobs(assigned_courier_id);

CREATE TABLE courier_assignments (
    id BIGSERIAL PRIMARY KEY,
    assignment_code VARCHAR(32) NOT NULL UNIQUE,
    task_type VARCHAR(20) NOT NULL,
    pickup_task_id BIGINT REFERENCES pickup_tasks(id) ON DELETE CASCADE,
    delivery_job_id BIGINT REFERENCES delivery_jobs(id) ON DELETE CASCADE,
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

CREATE INDEX idx_courier_assignments_courier ON courier_assignments(courier_id);
CREATE INDEX idx_courier_assignments_branch ON courier_assignments(branch_id);
CREATE INDEX idx_courier_assignments_status ON courier_assignments(status);
CREATE INDEX idx_courier_assignments_order ON courier_assignments(order_id);

CREATE TABLE courier_assignment_history (
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

CREATE INDEX idx_assignment_history_assignment ON courier_assignment_history(assignment_id);

CREATE TABLE delivery_attempts (
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

CREATE INDEX idx_delivery_attempts_job ON delivery_attempts(delivery_job_id);
CREATE INDEX idx_delivery_attempts_order ON delivery_attempts(order_id);

CREATE TABLE proofs_of_delivery (
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

CREATE INDEX idx_pod_order ON proofs_of_delivery(order_id);
CREATE INDEX idx_pod_tracking ON proofs_of_delivery(tracking_number);

CREATE TABLE delivery_exceptions (
    id BIGSERIAL PRIMARY KEY,
    exception_code VARCHAR(32) NOT NULL UNIQUE,
    delivery_job_id BIGINT NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exceptions_branch_status ON delivery_exceptions(branch_id, status);
CREATE INDEX idx_exceptions_job ON delivery_exceptions(delivery_job_id);

-- Seed baseline operational couriers across branches so fleet workload is computed from real DB records
INSERT INTO couriers (
    courier_code, user_id, name, phone, email, vehicle_type, vehicle_plate,
    branch_id, branch_code, branch_name, zone, availability_status,
    max_capacity, completed_today, total_completed_lifetime, rating, shift_start
) VALUES
    ('CR-101', 'courier-101', 'Kamal Silva', '+94 77 123 4567', 'kamal.silva@swiftdrop.lk', 'MOTORCYCLE', 'WP BDF-8942', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone A - Colombo Central', 'AVAILABLE', 10, 4, 1240, 4.90, '07:30 AM'),
    ('CR-102', 'courier-102', 'Sunil Wickramasinghe', '+94 71 987 6543', 'sunil.w@swiftdrop.lk', 'VAN', 'WP CAS-4412', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone B - Colombo East', 'AVAILABLE', 10, 3, 980, 4.80, '08:00 AM'),
    ('CR-103', 'courier-103', 'Kasun Dias', '+94 72 333 8899', 'kasun.dias@swiftdrop.lk', 'MOTORCYCLE', 'WP BDE-1102', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone C - Colombo South', 'AVAILABLE', 8, 5, 850, 4.90, '08:15 AM'),
    ('CR-104', 'courier-104', 'Saman Kumara', '+94 75 444 1122', 'saman.k@swiftdrop.lk', 'BICYCLE', 'ECO-CYCLE-04', 1, 'CMB-CENTRAL', 'Colombo Central Hub', 'Zone A - Colombo Central', 'AVAILABLE', 6, 2, 420, 4.70, '09:00 AM'),
    ('CR-105', 'courier-105', 'Mahesh Alwis', '+94 78 666 9900', 'mahesh.a@swiftdrop.lk', 'VAN', 'WP CAH-9988', 2, 'KDY-MAIN', 'Kandy Regional Hub', 'Zone K - Kandy City', 'AVAILABLE', 10, 3, 750, 4.80, '07:45 AM'),
    ('CR-106', 'courier-106', 'Pravin Weerakkody', '+94 70 111 2233', 'pravin.w@swiftdrop.lk', 'MOTORCYCLE', 'WP BDD-5566', 3, 'GAL-MAIN', 'Galle Southern Hub', 'Zone G - Galle Fort & South', 'OFFLINE', 8, 0, 310, 4.70, 'Off Shift');
