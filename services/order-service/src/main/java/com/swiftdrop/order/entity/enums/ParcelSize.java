package com.swiftdrop.order.entity.enums;

/**
 * Parcel size categories accepted by the booking flow.
 * Must stay in sync with the {@code chk_orders_parcel_size} constraint.
 */
public enum ParcelSize {
    SMALL,
    MEDIUM,
    LARGE,
    EXTRA_LARGE
}
