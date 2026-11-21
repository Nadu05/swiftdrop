package com.swiftdrop.dispatch.entity.enums;

public enum PickupTaskStatus {
    PENDING_ASSIGNMENT,
    ASSIGNED,
    ACCEPTED,
    PICKED_UP,
    BRANCH_RECEIVED,
    CANCELLED;

    public boolean isTerminal() {
        return this == BRANCH_RECEIVED || this == CANCELLED;
    }
}

