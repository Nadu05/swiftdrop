package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;

import java.util.List;

/** The owner's view of an order's delivery status history, oldest first. */
public record TimelineResponse(
        Long orderId,
        String trackingNumber,
        OrderStatus currentStatus,
        String currentStatusLabel,
        List<TimelineEntryResponse> events
) {

    public static TimelineResponse of(DeliveryOrder order, List<OrderStatusHistory> history) {
        return new TimelineResponse(order.getId(), order.getTrackingNumber(), order.getStatus(),
                order.getStatus().label(), history.stream().map(TimelineEntryResponse::from).toList());
    }
}
