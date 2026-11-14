package com.swiftdrop.dispatch.entity.enums;

public enum PickupMethod {
    COURIER_PICKUP,
    BRANCH_DROPOFF;

    public static PickupMethod fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return COURIER_PICKUP;
        }
        String normalized = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        if ("BRANCH_DROP_OFF".equals(normalized) || "DROPOFF".equals(normalized) || "BRANCH_DROPOFF".equals(normalized)) {
            return BRANCH_DROPOFF;
        }
        if ("COURIER_PICKUP".equals(normalized) || "PICKUP".equals(normalized)) {
            return COURIER_PICKUP;
        }
        throw new IllegalArgumentException("Unsupported pickup method: " + raw);
    }
}
