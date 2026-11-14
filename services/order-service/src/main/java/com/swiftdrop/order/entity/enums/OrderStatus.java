package com.swiftdrop.order.entity.enums;

import java.util.EnumSet;
import java.util.Set;

/**
 * Official delivery lifecycle owned by the Order service, and the only place that decides which status
 * may follow which.
 *
 * <pre>
 * CREATED -> PICKED_UP -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
 *    \___________\____________\______________\______> FAILED   (from any non-final status)
 * </pre>
 *
 * <p>{@link #DELIVERED} and {@link #FAILED} are final. Values must stay in sync with the
 * {@code chk_orders_status} and {@code chk_history_status} constraints in the Flyway migrations.
 */
public enum OrderStatus {
    CREATED("Created", "Order placed"),
    PICKED_UP("Picked Up", "Parcel picked up from the sender"),
    IN_TRANSIT("In Transit", "Parcel is on its way"),
    OUT_FOR_DELIVERY("Out for Delivery", "Parcel is out for delivery"),
    DELIVERED("Delivered", "Parcel delivered"),
    FAILED("Failed", "Delivery could not be completed");

    private final String label;
    private final String publicDescription;

    OrderStatus(String label, String publicDescription) {
        this.label = label;
        this.publicDescription = publicDescription;
    }

    /** Human-readable name for screens, for example {@code "Picked Up"}. */
    public String label() {
        return label;
    }

    /**
     * Fixed, server-written sentence for the public tracking page. Staff notes are never shown publicly
     * (a note could contain personal details), so this is all a stranger sees for a failed delivery.
     */
    public String publicDescription() {
        return publicDescription;
    }

    /** The statuses that may directly follow this one. */
    public Set<OrderStatus> allowedNext() {
        return switch (this) {
            case CREATED -> EnumSet.of(PICKED_UP, FAILED);
            case PICKED_UP -> EnumSet.of(IN_TRANSIT, FAILED);
            case IN_TRANSIT -> EnumSet.of(OUT_FOR_DELIVERY, FAILED);
            case OUT_FOR_DELIVERY -> EnumSet.of(DELIVERED, FAILED);
            case DELIVERED, FAILED -> EnumSet.noneOf(OrderStatus.class);
        };
    }

    public boolean canTransitionTo(OrderStatus next) {
        return next != null && allowedNext().contains(next);
    }

    public boolean isFinal() {
        return allowedNext().isEmpty();
    }
}
