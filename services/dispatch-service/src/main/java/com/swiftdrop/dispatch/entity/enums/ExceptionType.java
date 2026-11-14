package com.swiftdrop.dispatch.entity.enums;

public enum ExceptionType {
    MAX_ATTEMPTS_EXCEEDED,
    DAMAGED_PARCEL,
    LOST_PARCEL,
    MISSING_PARCEL,
    TRANSFER_DELAY,
    INCORRECT_PARCEL_HANDOVER,
    DELIVERY_FAILURE,
    RETURN_TO_SENDER_DECISION,
    ADDRESS_ISSUE,
    RECIPIENT_REFUSED;

    public static ExceptionType fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Exception type is required");
        }
        String normalized = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        for (ExceptionType t : values()) {
            if (t.name().equals(normalized)) {
                return t;
            }
        }
        if ("DAMAGED".equals(normalized)) return DAMAGED_PARCEL;
        if ("LOST".equals(normalized)) return LOST_PARCEL;
        if ("MISSING".equals(normalized)) return MISSING_PARCEL;
        if ("DELAY".equals(normalized) || "DELAYED".equals(normalized)) return TRANSFER_DELAY;
        if ("INCORRECT_HANDOVER".equals(normalized) || "WRONG_HANDOVER".equals(normalized)) return INCORRECT_PARCEL_HANDOVER;
        if ("RTS_DECISION".equals(normalized) || "RETURN_TO_SENDER".equals(normalized)) return RETURN_TO_SENDER_DECISION;
        throw new IllegalArgumentException("Unsupported exception type: " + raw);
    }
}
