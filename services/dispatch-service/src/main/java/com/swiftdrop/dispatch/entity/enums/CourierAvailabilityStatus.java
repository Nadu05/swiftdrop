package com.swiftdrop.dispatch.entity.enums;

public enum CourierAvailabilityStatus {
    AVAILABLE,
    BUSY,
    ON_BREAK,
    OFFLINE;

    public static CourierAvailabilityStatus fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return AVAILABLE;
        }
        String normalized = raw.trim().toUpperCase().replace(' ', '_').replace('-', '_');
        for (CourierAvailabilityStatus s : values()) {
            if (s.name().equals(normalized)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unsupported courier availability status: " + raw);
    }
}

