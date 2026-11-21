package com.swiftdrop.order.entity.enums;

public enum ParcelSize {
    SMALL("Small Parcel"),
    MEDIUM("Medium Parcel"),
    LARGE("Large Parcel"),
    EXTRA_LARGE("Extra Large Parcel");

    private final String label;

    ParcelSize(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static ParcelSize fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return MEDIUM;
        }
        String normalized = raw.trim().toUpperCase().replace(' ', '_').replace('-', '_');
        return switch (normalized) {
            case "SMALL", "DOCUMENT" -> SMALL;
            case "MEDIUM", "SMALL_PARCEL" -> MEDIUM;
            case "LARGE", "LARGE_ITEM" -> LARGE;
            case "EXTRA_LARGE", "XL" -> EXTRA_LARGE;
            default -> ParcelSize.valueOf(normalized);
        };
    }
}

