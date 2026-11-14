package com.swiftdrop.dispatch.entity.enums;

public enum AssignmentTaskType {
    PICKUP,
    DELIVERY;

    public static AssignmentTaskType fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return DELIVERY;
        }
        String normalized = raw.trim().toUpperCase();
        if ("PICKUP".equals(normalized) || "PICKUP_TASK".equals(normalized)) {
            return PICKUP;
        }
        return DELIVERY;
    }
}
