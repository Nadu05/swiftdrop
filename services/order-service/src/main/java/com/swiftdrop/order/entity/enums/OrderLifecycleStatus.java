package com.swiftdrop.order.entity.enums;

import java.util.Locale;

/**
 * Canonical 14-state parcel lifecycle for SwiftDrop Order Service.
 *
 * Normal lifecycle:
 * CREATED -> CONFIRMED -> PICKUP_ASSIGNED -> PICKED_UP -> AT_ORIGIN_BRANCH ->
 * IN_TRANSIT -> AT_DESTINATION_BRANCH -> OUT_FOR_DELIVERY -> DELIVERED
 *
 * Exception statuses:
 * DELIVERY_FAILED, PENDING_DISPATCHER_DECISION, RETURN_TO_SENDER, RETURNED_TO_SENDER, CANCELLED
 */
public enum OrderLifecycleStatus {
    CREATED("Created", false, false),
    CONFIRMED("Confirmed", false, false),
    PICKUP_ASSIGNED("Pickup Assigned", false, false),
    PICKED_UP("Picked Up", false, false),
    AT_ORIGIN_BRANCH("At Origin Branch", false, false),
    IN_TRANSIT("In Transit", false, false),
    AT_DESTINATION_BRANCH("At Destination Branch", false, false),
    OUT_FOR_DELIVERY("Out for Delivery", false, false),
    DELIVERED("Delivered", true, false),

    // Exception statuses
    DELIVERY_FAILED("Delivery Failed", false, true),
    PENDING_DISPATCHER_DECISION("Pending Dispatcher Decision", false, true),
    RETURN_TO_SENDER("Return to Sender", false, true),
    RETURNED_TO_SENDER("Returned to Sender", true, true),
    CANCELLED("Cancelled", true, true);

    private final String displayLabel;
    private final boolean terminal;
    private final boolean exceptionStatus;

    OrderLifecycleStatus(String displayLabel, boolean terminal, boolean exceptionStatus) {
        this.displayLabel = displayLabel;
        this.terminal = terminal;
        this.exceptionStatus = exceptionStatus;
    }

    public String getDisplayLabel() {
        return displayLabel;
    }

    public boolean isTerminal() {
        return terminal;
    }

    public boolean isExceptionStatus() {
        return exceptionStatus;
    }

    public static OrderLifecycleStatus fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Order status cannot be blank");
        }
        String trimmed = raw.trim();
        for (OrderLifecycleStatus s : values()) {
            if (s.name().equalsIgnoreCase(trimmed) || s.displayLabel.equalsIgnoreCase(trimmed)) {
                return s;
            }
        }
        String normalized = trimmed.toUpperCase(Locale.ROOT).replace(' ', '_').replace('-', '_');
        if ("FAILED".equals(normalized)) {
            return DELIVERY_FAILED;
        }
        return OrderLifecycleStatus.valueOf(normalized);
    }
}

