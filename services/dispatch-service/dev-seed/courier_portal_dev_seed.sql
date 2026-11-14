-- ============================================================
-- SwiftDrop Dispatch Service - DEVELOPMENT SEED (courier portal)
--
-- NOT a Flyway migration and NEVER run automatically.
-- For local/dev testing of the courier portal only. Do not run
-- against a shared or production database (agent.backend.md §5.13).
--
-- Creates courier CR-103 "Kasun Dias" and four jobs for them.
-- Safe to re-run: every insert is skipped if the row exists.
--
-- How to run (psql, against the dispatch database):
--   psql "<dispatch db url>" -f dev-seed/courier_portal_dev_seed.sql
--
-- Then in the frontend .env.local:
--   NEXT_PUBLIC_DISPATCH_API_MODE=api
--   NEXT_PUBLIC_DEV_COURIER_USER_ID=990103   (couriers.user_id, sent as X-User-Id)
--
-- user_id 990103 is a placeholder Identity user until login exists.
-- order_id values (900001..900004) are placeholders; Order is only
-- told about status changes through Dispatch's outbox events.
-- Requires migrations V1-V4 (courier_deliveries is V4).
-- branch_id 1 is a placeholder Organization branch reference.
-- ============================================================

INSERT INTO couriers (courier_code, user_id, name, phone, status, vehicle_type, vehicle_plate, branch_id, max_capacity)
SELECT 'CR-103', 990103, 'Kasun Dias', '+94 72 333 8899', 'AVAILABLE', 'MOTORCYCLE', 'WP BHK-4471', 1, 8
WHERE NOT EXISTS (SELECT 1 FROM couriers WHERE courier_code = 'CR-103');

-- Jobs: two waiting to be accepted, one delivered earlier today, one failed yesterday.
INSERT INTO assignments (assignment_code, order_id, courier_id, branch_id, status, assigned_at)
SELECT v.code, v.order_id, c.id, 1, v.status, v.assigned_at
FROM (VALUES
    ('DEV-ASN-7101', 900001::BIGINT, 'ASSIGNED',  NOW() - INTERVAL '20 minutes'),
    ('DEV-ASN-7102', 900002::BIGINT, 'ASSIGNED',  NOW() - INTERVAL '10 minutes'),
    ('DEV-ASN-7095', 900003::BIGINT, 'DELIVERED', NOW() - INTERVAL '5 hours'),
    ('DEV-ASN-7088', 900004::BIGINT, 'FAILED',    NOW() - INTERVAL '1 day')
) AS v(code, order_id, status, assigned_at)
JOIN couriers c ON c.courier_code = 'CR-103'
WHERE NOT EXISTS (SELECT 1 FROM assignments a WHERE a.assignment_code = v.code);

INSERT INTO courier_deliveries (
    assignment_id, tracking_number, priority,
    recipient_name, recipient_phone, delivery_address, delivery_city,
    pickup_name, pickup_phone, pickup_address, pickup_city,
    package_type, weight_kg, handling_notes, payout_amount,
    picked_up_at, completed_at, pod_type, pod_received_by, pod_reference,
    failure_reason, failure_notes)
SELECT a.id, v.tracking, v.priority,
       v.r_name, v.r_phone, v.r_address, v.r_city,
       v.p_name, v.p_phone, v.p_address, v.p_city,
       v.pkg, v.weight, v.notes, v.payout,
       v.picked_up_at, v.completed_at, v.pod_type, v.pod_by, v.pod_ref,
       v.fail_reason, v.fail_notes
FROM (VALUES
    ('DEV-ASN-7101', 'SD-DEV-94820', 'URGENT',
     'Amali Perera', '+94 77 123 4567', 'No. 18, Rajagiriya Road', 'Rajagiriya',
     'Cafe Mocha', '+94 11 250 0001', '12 Galle Road, Colombo 03', 'Colombo',
     'SMALL', 1.20::NUMERIC, 'Keep upright', 450.00::NUMERIC,
     NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL, NULL, NULL, NULL, NULL),
    ('DEV-ASN-7102', 'SD-DEV-94822', 'STANDARD',
     'Nuwan Fernando', '+94 71 555 0192', '22/1 High Level Road', 'Nugegoda',
     'Lanka Fresh Foods', '+94 11 250 0002', '45 Duplication Road, Colombo 04', 'Colombo',
     'MEDIUM', 4.50::NUMERIC, NULL, 520.00::NUMERIC,
     NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('DEV-ASN-7095', 'SD-DEV-94811', 'STANDARD',
     'Sajith Gunawardena', '+94 76 222 1100', '14 Stanley Tillekeratne Mawatha', 'Nugegoda',
     'BookHub Colombo', '+94 11 250 0003', '8 Ward Place, Colombo 07', 'Colombo',
     'SMALL', 0.50::NUMERIC, NULL, 420.00::NUMERIC,
     NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', 'OTP', 'Sajith Gunawardena', '4417', NULL, NULL),
    ('DEV-ASN-7088', 'SD-DEV-94799', 'STANDARD',
     'Ruwani Jayasinghe', '+94 77 909 1212', '71 Hill Street', 'Dehiwala',
     'TechZone Lanka', '+94 11 250 0004', '33 Union Place, Colombo 02', 'Colombo',
     'SMALL', 1.80::NUMERIC, 'Fragile', NULL,
     NOW() - INTERVAL '23 hours', NOW() - INTERVAL '22 hours', NULL, NULL, NULL,
     'Recipient not available', 'Called twice, no answer. Gate locked.')
) AS v(code, tracking, priority, r_name, r_phone, r_address, r_city,
       p_name, p_phone, p_address, p_city, pkg, weight, notes, payout,
       picked_up_at, completed_at, pod_type, pod_by, pod_ref, fail_reason, fail_notes)
JOIN assignments a ON a.assignment_code = v.code
WHERE NOT EXISTS (SELECT 1 FROM courier_deliveries d WHERE d.assignment_id = a.id);

-- Use user_id as NEXT_PUBLIC_DEV_COURIER_USER_ID / X-User-Id
SELECT id, user_id, courier_code, name FROM couriers WHERE courier_code = 'CR-103';
