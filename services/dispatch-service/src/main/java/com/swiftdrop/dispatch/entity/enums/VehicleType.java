package com.swiftdrop.dispatch.entity.enums;

public enum VehicleType {
    MOTORCYCLE("Motorcycle"),
    VAN("Van"),
    BICYCLE("Bicycle");

    private final String displayName;

    VehicleType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static VehicleType fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return MOTORCYCLE;
        }
        String normalized = raw.trim().toUpperCase();
        for (VehicleType vt : values()) {
            if (vt.name().equals(normalized) || vt.displayName.equalsIgnoreCase(raw.trim())) {
                return vt;
            }
        }
        return MOTORCYCLE;
    }
}

