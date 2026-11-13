-- ============================================================
-- SwiftDrop Organization Service - Merchant Application Schema
-- Phase 2: Merchant Onboarding, Approval Queue & Audit History
-- ============================================================

CREATE TABLE merchant_applications (
    id                           BIGSERIAL      PRIMARY KEY,
    application_code             VARCHAR(50)    NOT NULL,
    applicant_user_id            VARCHAR(100),
    applicant_email              VARCHAR(255)   NOT NULL,
    business_name                VARCHAR(255)   NOT NULL,
    legal_name                   VARCHAR(255),
    business_registration_number VARCHAR(100)   NOT NULL,
    category                     VARCHAR(50)    NOT NULL DEFAULT 'OTHER',
    contact_full_name            VARCHAR(255)   NOT NULL,
    contact_designation          VARCHAR(150),
    contact_email                VARCHAR(255)   NOT NULL,
    contact_phone                VARCHAR(50)    NOT NULL,
    street_address               VARCHAR(500)   NOT NULL,
    city                         VARCHAR(255)   NOT NULL,
    district                     VARCHAR(255),
    postal_code                  VARCHAR(50),
    nearest_branch               VARCHAR(255),
    expected_daily_volume        VARCHAR(100),
    status                       VARCHAR(40)    NOT NULL DEFAULT 'PENDING',
    rejection_reason             VARCHAR(1000),
    review_notes                 VARCHAR(1000),
    reviewed_by                  VARCHAR(255),
    reviewed_at                  TIMESTAMP,
    submitted_at                 TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_merchant_applications_code UNIQUE (application_code),
    CONSTRAINT uq_merchant_applications_brn UNIQUE (business_registration_number),
    CONSTRAINT chk_merchant_applications_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX idx_merchant_applications_status ON merchant_applications (status);
CREATE INDEX idx_merchant_applications_category ON merchant_applications (category);
CREATE INDEX idx_merchant_applications_applicant_user ON merchant_applications (applicant_user_id);

CREATE TABLE merchant_application_history (
    id              BIGSERIAL      PRIMARY KEY,
    application_id  BIGINT         NOT NULL,
    previous_status VARCHAR(40),
    new_status      VARCHAR(40)    NOT NULL,
    action          VARCHAR(50)    NOT NULL,
    actor_email     VARCHAR(255)   NOT NULL,
    actor_user_id   VARCHAR(100),
    reason          VARCHAR(1000),
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_merchant_app_history_app FOREIGN KEY (application_id)
        REFERENCES merchant_applications (id) ON DELETE CASCADE
);

CREATE INDEX idx_merchant_app_history_app_id ON merchant_application_history (application_id);

-- Seed initial merchant applications for Head Office Administration
INSERT INTO merchant_applications (
    application_code, applicant_user_id, applicant_email, business_name, legal_name,
    business_registration_number, category, contact_full_name, contact_designation,
    contact_email, contact_phone, street_address, city, district, postal_code,
    nearest_branch, expected_daily_volume, status, rejection_reason, review_notes,
    reviewed_by, reviewed_at, submitted_at, updated_at
) VALUES
(
    'APP-2026-0819', 'user-merch-001', 'sunil@lankafreshfoods.lk',
    'Lanka Fresh Foods (Pvt) Ltd', 'Lanka Fresh Foods Private Limited',
    'PV-00214890', 'GROCERY_FOOD', 'Sunil Jayawardena', 'Managing Director',
    'sunil@lankafreshfoods.lk', '+94 77 123 4567',
    '45 Galle Road', 'Colombo 03', 'Colombo', '00300',
    'Colombo Central Hub', '100-250 parcels/day', 'PENDING', NULL, NULL,
    NULL, NULL, TIMESTAMP '2026-11-10 14:30:00', TIMESTAMP '2026-11-10 14:30:00'
),
(
    'APP-2026-0820', 'user-merch-002', 'nadeesha@citypharmacy.lk',
    'City Pharmacy', 'City Care Pharmaceuticals Ltd',
    'PV-00198421', 'PHARMACY', 'Dr. Nadeesha Perera', 'Chief Pharmacist',
    'nadeesha@citypharmacy.lk', '+94 71 987 6543',
    '128 High Level Road', 'Nugegoda', 'Colombo', '10250',
    'Colombo Central Hub', '50-100 parcels/day', 'PENDING', NULL,
    'NMRA Pharmacy License document under verification.',
    NULL, NULL, TIMESTAMP '2026-11-09 10:15:00', TIMESTAMP '2026-11-10 09:00:00'
),
(
    'APP-2026-0821', 'user-merch-003', 'kasun@urbanwear.lk',
    'Urban Wear', 'Urban Wear Apparel (Pvt) Ltd',
    'PV-00305124', 'RETAIL', 'Kasun Wijesinghe', 'Operations Lead',
    'kasun@urbanwear.lk', '+94 76 555 4321',
    '82 Peradeniya Road', 'Kandy', 'Kandy', '20000',
    'Kandy Regional Hub', '200+ parcels/day', 'APPROVED', NULL,
    'All business registration, VAT, and warehouse documents verified.',
    'admin@swiftdrop.lk', TIMESTAMP '2026-11-08 16:45:00', TIMESTAMP '2026-11-07 11:00:00', TIMESTAMP '2026-11-08 16:45:00'
),
(
    'APP-2026-0822', 'user-merch-004', 'rohan@quickgadgets.lk',
    'Quick Gadgets Hub', 'Quick Gadgets Hub Trading',
    'BR-9941205', 'OTHER', 'Rohan Silva', 'Proprietor',
    'rohan@quickgadgets.lk', '+94 70 444 8899',
    '14 Main Street', 'Negombo', 'Gampaha', '11500',
    'Colombo Central Hub', '10-30 parcels/day', 'REJECTED',
    'Business registration certificate number could not be verified with the Department of Registrar of Companies.',
    'Rejected due to unverified BRN.',
    'admin@swiftdrop.lk', TIMESTAMP '2026-11-06 15:20:00', TIMESTAMP '2026-11-05 09:30:00', TIMESTAMP '2026-11-06 15:20:00'
);

INSERT INTO merchant_application_history (
    application_id, previous_status, new_status, action, actor_email, actor_user_id, reason, created_at
) VALUES
(1, NULL, 'PENDING', 'SUBMITTED', 'sunil@lankafreshfoods.lk', 'user-merch-001', 'Initial merchant onboarding submission', TIMESTAMP '2026-11-10 14:30:00'),
(2, NULL, 'PENDING', 'SUBMITTED', 'nadeesha@citypharmacy.lk', 'user-merch-002', 'Initial merchant onboarding submission', TIMESTAMP '2026-11-09 10:15:00'),
(3, NULL, 'PENDING', 'SUBMITTED', 'kasun@urbanwear.lk', 'user-merch-003', 'Initial merchant onboarding submission', TIMESTAMP '2026-11-07 11:00:00'),
(3, 'PENDING', 'APPROVED', 'APPROVED', 'admin@swiftdrop.lk', 'admin-001', 'All business registration, VAT, and warehouse documents verified.', TIMESTAMP '2026-11-08 16:45:00'),
(4, NULL, 'PENDING', 'SUBMITTED', 'rohan@quickgadgets.lk', 'user-merch-004', 'Initial merchant onboarding submission', TIMESTAMP '2026-11-05 09:30:00'),
(4, 'PENDING', 'REJECTED', 'REJECTED', 'admin@swiftdrop.lk', 'admin-001', 'Business registration certificate number could not be verified with the Department of Registrar of Companies.', TIMESTAMP '2026-11-06 15:20:00');

