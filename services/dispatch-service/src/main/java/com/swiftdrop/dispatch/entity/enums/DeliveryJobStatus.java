package com.swiftdrop.dispatch.entity.enums;

public enum DeliveryJobStatus {
    UNASSIGNED,
    ASSIGNED,
    ACCEPTED,
    IN_TRANSIT,
    DELIVERED,
    FAILED,
    PENDING_DISPATCHER_DECISION,
    RETURN_TO_SENDER,
    RETURNED_TO_SENDER,
    CANCELLED;

    public boolean isTerminal() {
        return this == DELIVERED || this == RETURNED_TO_SENDER || this == CANCELLED;
    }
}
