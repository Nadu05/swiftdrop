package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderStatus;

import java.time.Instant;

/**
 * Result of a status change. Deliberately small: the caller (a courier or staff member) learns the new
 * state, not the customer's addresses or phone numbers.
 */
public record StatusChangeResponse(
        Long id,
        String trackingNumber,
        OrderStatus previousStatus,
        OrderStatus status,
        String statusLabel,
        Instant updatedAt
) {

    public static StatusChangeResponse of(DeliveryOrder order, OrderStatus previous) {
        return new StatusChangeResponse(order.getId(), order.getTrackingNumber(), previous,
                order.getStatus(), order.getStatus().label(), order.getUpdatedAt());
    }
}
