package com.swiftdrop.dispatch.entity.enums;

public enum TransferManifestStatus {
    DRAFT,
    ASSIGNED,
    IN_TRANSIT,
    RECEIVED_WITH_DISCREPANCY,
    COMPLETED,
    CANCELLED;

    public boolean isActiveConflictState() {
        return this == DRAFT
                || this == ASSIGNED
                || this == IN_TRANSIT
                || this == RECEIVED_WITH_DISCREPANCY;
    }

    public boolean isTerminal() {
        return this == COMPLETED || this == CANCELLED;
    }
}

