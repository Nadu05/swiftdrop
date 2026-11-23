package com.swiftdrop.organization.entity.enums;

public enum MerchantApplicationStatus {
    PENDING("Pending Review"),
    MORE_INFORMATION_REQUIRED("More Information Required"),
    APPROVED("Approved"),
    REJECTED("Rejected"),
    SUSPENDED("Suspended"),
    TERMINATED("Terminated");

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
        if ("PENDING_REVIEW".equals(normalized)) {
            return PENDING;
        }
        if ("CORRECTIONS_REQUESTED".equals(normalized)) {
            return MORE_INFORMATION_REQUIRED;
        }
        return MerchantApplicationStatus.valueOf(normalized);
    }
}
