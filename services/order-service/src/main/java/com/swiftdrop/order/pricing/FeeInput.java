package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;

import java.math.BigDecimal;

/**
 * Everything the fee depends on.
 *
 * @param size       parcel size category
 * @param weightKg   parcel weight
 * @param distanceKm distance between the pickup and delivery towns (already rounded to 2 decimals)
 * @param crossZone  true when the towns are in different districts
 */
public record FeeInput(ParcelSize size, BigDecimal weightKg, BigDecimal distanceKm, boolean crossZone) {
}
