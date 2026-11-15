-- ============================================================
-- SwiftDrop Dispatch Service - Schema Migration V4
-- Feature: Dispatch Delivery History & Proof of Delivery (POD)
-- Tables: assignments (extended), delivery_proofs
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend assignments table with delivery completion & snapshot fields
-- ------------------------------------------------------------
ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS delivery_attempts INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS delivery_notes VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(500),
    ADD COLUMN IF NOT EXISTS recipient_city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS merchant_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL',
    ADD COLUMN IF NOT EXISTS package_category VARCHAR(100),
    ADD COLUMN IF NOT EXISTS package_weight VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_assignments_completed_at ON assignments (completed_at);

-- ------------------------------------------------------------
-- 2. Table: delivery_proofs
-- Secure proof-of-delivery metadata recorded upon fulfillment.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_proofs (
    id                   BIGSERIAL    PRIMARY KEY,
    assignment_id        BIGINT       NOT NULL UNIQUE,
    recipient_name       VARCHAR(255) NOT NULL,
    pod_type             VARCHAR(20)  NOT NULL DEFAULT 'SIGNATURE',
    confirmation_details VARCHAR(1000),
    pod_reference        VARCHAR(100) NOT NULL UNIQUE,
    photo_url            VARCHAR(1000),
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_delivery_proofs_assignment FOREIGN KEY (assignment_id)
        REFERENCES assignments (id) ON DELETE CASCADE,
    CONSTRAINT chk_delivery_proofs_pod_type CHECK (pod_type IN ('SIGNATURE', 'PHOTO', 'OTP', 'NONE'))
);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_assignment_id ON delivery_proofs (assignment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_proofs_pod_reference ON delivery_proofs (pod_reference);

-- ------------------------------------------------------------
-- 3. Seed base operational couriers (if not present)
-- ------------------------------------------------------------
INSERT INTO couriers (courier_code, user_id, name, phone, status, vehicle_type, vehicle_plate, branch_id, max_capacity)
VALUES
    ('CR-101', 101, 'Kamal Silva', '+94 77 123 4567', 'AVAILABLE', 'MOTORCYCLE', 'WP BDF-8942', 1, 5),
    ('CR-102', 102, 'Nimal Perera', '+94 77 234 5678', 'AVAILABLE', 'VAN', 'WP CAA-4512', 1, 8),
    ('CR-103', 103, 'Kasun Dias', '+94 77 345 6789', 'AVAILABLE', 'MOTORCYCLE', 'WP BDE-1102', 1, 5),
    ('CR-104', 104, 'Sunil Shantha', '+94 71 456 7890', 'AVAILABLE', 'VAN', 'SP WP-3321', 2, 7)
ON CONFLICT (courier_code) DO NOTHING;

-- ------------------------------------------------------------
-- 4. Seed historical completed delivery assignments
-- ------------------------------------------------------------
INSERT INTO assignments (
    assignment_code, order_id, courier_id, branch_id, assigned_by, status,
    assigned_at, completed_at, delivery_attempts, delivery_notes,
    tracking_number, recipient_name, recipient_phone, delivery_address, recipient_city,
    merchant_name, merchant_phone, priority, package_category, package_weight
)
SELECT
    'ASN-HIST-001', 98399, c.id, 1, 1, 'DELIVERED',
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '22 hours', 1,
    'Standard residential drop-off. Customer verified contents before signing.',
    'SD-94799', 'Nimali Jayasuriya', '+94 71 889 4411', '45/2 Ward Place', 'Colombo 07',
    'Urban Fashion Boutique', '+94 11 234 5678', 'HIGH', 'Apparel & Fashion', '1.2 kg'
FROM couriers c WHERE c.courier_code = 'CR-101'
ON CONFLICT (assignment_code) DO NOTHING;

INSERT INTO assignments (
    assignment_code, order_id, courier_id, branch_id, assigned_by, status,
    assigned_at, completed_at, delivery_attempts, delivery_notes, failure_reason,
    tracking_number, recipient_name, recipient_phone, delivery_address, recipient_city,
    merchant_name, merchant_phone, priority, package_category, package_weight
)
SELECT
    'ASN-HIST-002', 98398, c.id, 1, 1, 'FAILED',
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '40 hours', 3,
    'Gated community security refused entry without resident approval. Customer mobile switched off.',
    'Customer unreachable after 3 attempts at designated delivery window.',
    'SD-94798', 'Charith Senanayake', '+94 77 990 0112', '112/B Galle Road, Mount Lavinia', 'Colombo South',
    'Electro Lanka Tech', '+94 11 445 1122', 'URGENT', 'Consumer Electronics', '3.5 kg'
FROM couriers c WHERE c.courier_code = 'CR-103'
ON CONFLICT (assignment_code) DO NOTHING;

INSERT INTO assignments (
    assignment_code, order_id, courier_id, branch_id, assigned_by, status,
    assigned_at, completed_at, delivery_attempts, delivery_notes,
    tracking_number, recipient_name, recipient_phone, delivery_address, recipient_city,
    merchant_name, merchant_phone, priority, package_category, package_weight
)
SELECT
    'ASN-HIST-003', 98395, c.id, 1, 1, 'DELIVERED',
    CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '68 hours', 1,
    'Commercial reception delivery. Security officer confirmed delivery and stamped receipt.',
    'SD-94795', 'Dinesh Gunasekara', '+94 70 334 5566', 'Level 14, World Trade Center', 'Colombo 01',
    'Ceylon Organic Teas', '+94 11 778 8990', 'NORMAL', 'Food & Beverage', '0.8 kg'
FROM couriers c WHERE c.courier_code = 'CR-102'
ON CONFLICT (assignment_code) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Seed proof of delivery records for completed deliveries
-- ------------------------------------------------------------
INSERT INTO delivery_proofs (assignment_id, recipient_name, pod_type, confirmation_details, pod_reference, photo_url)
SELECT a.id, 'Nimali Jayasuriya', 'SIGNATURE',
       'Handed directly to recipient at residence entrance. Customer signed delivery sheet.',
       'POD-SD-94799-SIG', NULL
FROM assignments a WHERE a.assignment_code = 'ASN-HIST-001'
ON CONFLICT (assignment_id) DO NOTHING;

INSERT INTO delivery_proofs (assignment_id, recipient_name, pod_type, confirmation_details, pod_reference, photo_url)
SELECT a.id, 'Dinesh Gunasekara (WTC Reception)', 'OTP',
       'Digitally verified through recipient OTP authentication code 894102.',
       'POD-SD-94795-OTP', NULL
FROM assignments a WHERE a.assignment_code = 'ASN-HIST-003'
ON CONFLICT (assignment_id) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Seed audit timeline history
-- ------------------------------------------------------------
INSERT INTO assignment_history (assignment_id, previous_courier_id, new_courier_id, changed_by, change_reason, changed_at)
SELECT a.id, NULL, a.courier_id, 1, 'Initial dispatch allocation to courier', a.assigned_at
FROM assignments a WHERE a.assignment_code IN ('ASN-HIST-001', 'ASN-HIST-002', 'ASN-HIST-003')
ON CONFLICT DO NOTHING;

INSERT INTO assignment_history (assignment_id, previous_courier_id, new_courier_id, changed_by, change_reason, changed_at)
SELECT a.id, a.courier_id, a.courier_id, a.courier_id,
       CASE
           WHEN a.status = 'DELIVERED' THEN 'Package delivered and proof-of-delivery recorded'
           WHEN a.status = 'FAILED' THEN 'Delivery failed: customer unreachable after designated attempts'
           ELSE 'Status updated'
       END,
       a.completed_at
FROM assignments a WHERE a.assignment_code IN ('ASN-HIST-001', 'ASN-HIST-002', 'ASN-HIST-003')
ON CONFLICT DO NOTHING;

