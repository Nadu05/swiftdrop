package com.swiftdrop.order.entity.enums;

/**
 * Official delivery lifecycle owned by the Order service.
 *
 * <p>Values must stay in sync with the {@code chk_orders_status} and
 * {@code chk_history_status} constraints in the Flyway migrations. The allowed
 * transition matrix is introduced with the tracking-timeline work; creation only
 * ever produces {@link #CREATED}.
 */
public enum OrderStatus {
    CREATED,
    PICKED_UP,
    IN_TRANSIT,
    OUT_FOR_DELIVERY,
    DELIVERED,
    FAILED
}
