package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;

import java.time.Instant;

/** One step of an order's private (owner-only) timeline. The id of whoever made the change is never exposed. */
public record TimelineEntryResponse(
        OrderStatus status,
        String statusLabel,
        String note,
        String location,
        Instant timestamp
) {

    public static TimelineEntryResponse from(OrderStatusHistory entry) {
        return new TimelineEntryResponse(entry.getStatus(), entry.getStatus().label(),
                entry.getNote(), entry.getLocation(), entry.getCreatedAt());
    }
}
