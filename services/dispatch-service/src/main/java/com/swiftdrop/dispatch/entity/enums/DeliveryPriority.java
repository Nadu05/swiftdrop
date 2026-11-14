package com.swiftdrop.dispatch.entity.enums;

public enum DeliveryPriority {
    URGENT,
    HIGH,
    NORMAL;

    public static DeliveryPriority fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return NORMAL;
        }
        String normalized = raw.trim().toUpperCase();
        for (DeliveryPriority p : values()) {
            if (p.name().equals(normalized)) {
                return p;
            }
        }
        return NORMAL;
    }
}
