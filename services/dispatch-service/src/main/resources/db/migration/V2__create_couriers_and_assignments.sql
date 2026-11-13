-- ============================================================
-- SwiftDrop Dispatch Service - Schema Migration V2
-- Feature: Dispatch Courier Assignment
-- Tables: couriers, assignments, assignment_history
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table: couriers
-- Operational courier profiles managed by Dispatch Service.
-- External references:
--   user_id   -> Identity Service (auth user / credentials)
--   branch_id -> Organization Service (assigned dispatch hub)
-- ------------------------------------------------------------
CREATE TABLE couriers (
    id            BIGSERIAL    PRIMARY KEY,
    courier_code  VARCHAR(50)  NOT NULL,
    user_id       BIGINT,
    name          VARCHAR(255) NOT NULL,
    phone         VARCHAR(50)  NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE',
    vehicle_type  VARCHAR(20)  NOT NULL,
    vehicle_plate VARCHAR(50),
    branch_id     BIGINT       NOT NULL,
    max_capacity  INT          NOT NULL DEFAULT 5,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_couriers_code UNIQUE (courier_code),
    CONSTRAINT uq_couriers_user_id UNIQUE (user_id),
    CONSTRAINT chk_couriers_status CHECK (status IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
    CONSTRAINT chk_couriers_vehicle_type CHECK (vehicle_type IN ('MOTORCYCLE', 'VAN', 'BICYCLE')),
    CONSTRAINT chk_couriers_max_capacity CHECK (max_capacity > 0)
);

CREATE INDEX idx_couriers_status ON couriers (status);
CREATE INDEX idx_couriers_branch_id ON couriers (branch_id);

-- ------------------------------------------------------------
-- 2. Table: assignments
-- Operational courier-to-order delivery assignments.
-- External references:
--   order_id    -> Order Service (authoritative delivery request)
--   branch_id   -> Organization Service (dispatch hub)
--   assigned_by -> Identity Service (dispatcher user)
-- ------------------------------------------------------------
CREATE TABLE assignments (
    id              BIGSERIAL    PRIMARY KEY,
    assignment_code VARCHAR(50)  NOT NULL,
    order_id        BIGINT       NOT NULL,
    courier_id      BIGINT       NOT NULL,
    branch_id       BIGINT       NOT NULL,
    assigned_by     BIGINT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ASSIGNED',
    assigned_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_assignments_code UNIQUE (assignment_code),
    CONSTRAINT fk_assignments_courier FOREIGN KEY (courier_id) REFERENCES couriers (id) ON DELETE RESTRICT,
    CONSTRAINT chk_assignments_status CHECK (status IN (
        'ASSIGNED',
        'ACCEPTED',
        'IN_TRANSIT',
        'DELIVERED',
        'FAILED',
        'REASSIGNED',
        'CANCELLED'
    ))
);

CREATE INDEX idx_assignments_courier_id ON assignments (courier_id);
CREATE INDEX idx_assignments_order_id ON assignments (order_id);
CREATE INDEX idx_assignments_branch_id ON assignments (branch_id);
CREATE INDEX idx_assignments_status ON assignments (status);
CREATE INDEX idx_assignments_assigned_at ON assignments (assigned_at);

-- Partial Unique Index: Exactly one active assignment per order
-- Prevents duplicate active assignments simultaneously while preserving
-- full historical records for reassigned, delivered, failed, or cancelled orders.
CREATE UNIQUE INDEX uq_assignments_active_order ON assignments (order_id)
WHERE status IN ('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT');

-- ------------------------------------------------------------
-- 3. Table: assignment_history
-- Audit trail tracking assignment creation and reassignments.
-- Foreign keys use ON DELETE RESTRICT to strictly preserve
-- immutable audit records.
-- ------------------------------------------------------------
CREATE TABLE assignment_history (
    id                  BIGSERIAL     PRIMARY KEY,
    assignment_id       BIGINT        NOT NULL,
    previous_courier_id BIGINT,
    new_courier_id      BIGINT        NOT NULL,
    changed_by          BIGINT,
    change_reason       VARCHAR(1000),
    changed_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_history_assignment FOREIGN KEY (assignment_id)
        REFERENCES assignments (id) ON DELETE RESTRICT,
    CONSTRAINT fk_assignment_history_prev_courier FOREIGN KEY (previous_courier_id)
        REFERENCES couriers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_assignment_history_new_courier FOREIGN KEY (new_courier_id)
        REFERENCES couriers (id) ON DELETE RESTRICT
);

CREATE INDEX idx_assignment_history_assignment_id ON assignment_history (assignment_id);
CREATE INDEX idx_assignment_history_new_courier_id ON assignment_history (new_courier_id);
CREATE INDEX idx_assignment_history_prev_courier_id ON assignment_history (previous_courier_id);
CREATE INDEX idx_assignment_history_changed_at ON assignment_history (changed_at);
