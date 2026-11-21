package com.swiftdrop.organization.entity.enums;

public enum MerchantApplicationStatus {
    PENDING("Pending Review"),
    APPROVED("Approved"),
    REJECTED("Rejected");

    private final String label;

    MerchantApplicationStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static MerchantApplicationStatus fromFilter(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim().toUpperCase();
        if ("PENDING_REVIEW".equals(normalized) || "CORRECTIONS_REQUESTED".equals(normalized)) {
            return PENDING;
        }
        return MerchantApplicationStatus.valueOf(normalized);
    }
}

