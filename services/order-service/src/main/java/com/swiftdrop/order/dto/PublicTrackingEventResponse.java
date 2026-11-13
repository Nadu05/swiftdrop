package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;

import java.time.Instant;

/**
 * One public timeline step. The description is a fixed sentence per status: staff notes, locations and
 * the id of whoever made the change are not included.
 */
public record PublicTrackingEventResponse(
        OrderStatus status,
        String statusLabel,
        String description,
        Instant timestamp
) {

    public static PublicTrackingEventResponse from(OrderStatusHistory entry) {
        OrderStatus status = entry.getStatus();
        return new PublicTrackingEventResponse(status, status.label(), status.publicDescription(), entry.getCreatedAt());
    }
}
