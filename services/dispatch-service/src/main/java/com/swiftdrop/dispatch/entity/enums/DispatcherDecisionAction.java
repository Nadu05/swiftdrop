package com.swiftdrop.dispatch.entity.enums;

public enum DispatcherDecisionAction {
    RETURN_TO_SENDER,
    RESCHEDULE_DELIVERY,
    HOLD_AT_BRANCH;

    public static DispatcherDecisionAction fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Dispatcher decision action is required");
        }
        String normalized = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        if ("RETURN_TO_SENDER".equals(normalized) || "RETURN".equals(normalized)) {
            return RETURN_TO_SENDER;
        }
        if ("RESCHEDULE_DELIVERY".equals(normalized) || "RESCHEDULE".equals(normalized) || "RETRY_DELIVERY".equals(normalized) || "OUT_FOR_DELIVERY".equals(normalized)) {
            return RESCHEDULE_DELIVERY;
        }
        if ("HOLD_AT_BRANCH".equals(normalized) || "HOLD".equals(normalized)) {
            return HOLD_AT_BRANCH;
        }
        throw new IllegalArgumentException("Unsupported dispatcher decision action: " + raw);
    }
}
