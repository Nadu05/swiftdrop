package com.swiftdrop.order.messaging;

import com.swiftdrop.order.entity.enums.OrderStatus;

/**
 * Payload of {@code order.delivery.created.v1}. Deliberately contains no addresses, phone numbers or
 * names: consumers that need them call the Order API with the id.
 */
public record OrderCreatedData(
        Long deliveryId,
        String trackingNumber,
        Long customerId,
        Long branchId,
        OrderStatus status
) {
}
