package com.swiftdrop.dispatch.entity.enums;

public enum ExceptionStatus {
    OPEN,
    UNDER_INVESTIGATION,
    PENDING_DECISION,
    RESOLVED,
    CLOSED;

    public static ExceptionStatus fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Exception status is required");
        }
        String normalized = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        for (ExceptionStatus s : values()) {
            if (s.name().equals(normalized)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unsupported exception status: " + raw);
    }

    public boolean isTerminal() {
        return this == RESOLVED || this == CLOSED;
    }
}
