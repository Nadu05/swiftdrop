package com.swiftdrop.dispatch.entity.enums;

public enum AssignmentStatus {
    ASSIGNED,
    ACCEPTED,
    IN_TRANSIT,
    DELIVERED,
    REASSIGNED,
    FAILED,
    CANCELLED;

    public boolean isActiveWorkload() {
        return this == ASSIGNED || this == ACCEPTED || this == IN_TRANSIT || this == REASSIGNED;
    }
}

