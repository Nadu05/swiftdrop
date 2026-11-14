package com.swiftdrop.dispatch.entity.enums;

public enum ReturnTaskStatus {
    PENDING_ASSIGNMENT,
    COURIER_ASSIGNED,
    IN_TRANSIT,
    AT_ORIGIN_BRANCH,
    OUT_FOR_RETURN,
    RETURNED_TO_SENDER,
    CANCELLED;

    public static ReturnTaskStatus fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Return task status is required");
        }
        String normalized = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        for (ReturnTaskStatus s : values()) {
            if (s.name().equals(normalized)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unsupported return task status: " + raw);
    }

    public boolean isTerminal() {
        return this == RETURNED_TO_SENDER || this == CANCELLED;
    }
}

