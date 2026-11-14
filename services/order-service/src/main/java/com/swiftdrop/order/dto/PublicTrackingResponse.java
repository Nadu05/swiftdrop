package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * What anyone holding a tracking number may see. This is an allow-list: a field only appears here after it
 * was judged safe for a stranger. Never add addresses, contact names or phones, customer or branch ids,
 * the fee, notes or any other internal value.
 *
 * <p>{@code origin} and {@code destination} are town names only, not street addresses.
 */
public record PublicTrackingResponse(
        String trackingNumber,
        OrderStatus status,
        String statusLabel,
        String origin,
        String destination,
        ParcelSize parcelCategory,
        BigDecimal distanceKm,
        Instant updatedAt,
        List<PublicTrackingEventResponse> events
) {
}
