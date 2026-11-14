package com.swiftdrop.order.messaging;

import com.swiftdrop.order.entity.enums.OrderStatus;

import java.time.Instant;

/**
 * Payload of {@code order.delivery.status-changed.v1}. Like the created event it holds no addresses, names,
 * phone numbers, notes or locations: consumers that need more call the Order API with the id.
 */
public record OrderStatusChangedData(
        Long deliveryId,
        String trackingNumber,
        Long customerId,
        Long branchId,
        OrderStatus previousStatus,
        OrderStatus status,
        Instant changedAt
) {
}
