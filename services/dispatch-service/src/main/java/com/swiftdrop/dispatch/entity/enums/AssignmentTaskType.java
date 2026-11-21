package com.swiftdrop.dispatch.entity.enums;

public enum AssignmentTaskType {
    PICKUP,
    DELIVERY,
    TRANSFER,
    RETURN;

    public static AssignmentTaskType fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return DELIVERY;
        }
        String normalized = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        if ("PICKUP".equals(normalized) || "PICKUP_TASK".equals(normalized)) {
            return PICKUP;
        }
        if ("TRANSFER".equals(normalized) || "TRANSFER_MANIFEST".equals(normalized)) {
            return TRANSFER;
        }
        if ("RETURN".equals(normalized) || "RETURN_TASK".equals(normalized) || "RTS".equals(normalized)) {
            return RETURN;
        }
        return DELIVERY;
    }
}
