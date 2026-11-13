package com.swiftdrop.dispatch.entity.enums;

/**
 * Represents the operational lifecycle status of a courier-to-order assignment.
 * Matches exactly the values defined in the V2 database migration.
 */
public enum AssignmentStatus {
    ASSIGNED,
    ACCEPTED,
    IN_TRANSIT,
    DELIVERED,
    FAILED,
    REASSIGNED,
    CANCELLED
}

