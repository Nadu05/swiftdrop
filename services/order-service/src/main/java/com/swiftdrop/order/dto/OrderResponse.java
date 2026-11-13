package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Private (owner-only) view of an order, returned by create and get-by-id.
 * {@code status} is the status code (e.g. {@code PICKED_UP}); display labels are a UI concern.
 */
public record OrderResponse(
        Long id,
        String trackingNumber,
        OrderStatus status,
        BigDecimal deliveryFee,
        String currency,
        String pickupAddress,
        String pickupContactName,
        String pickupContactPhone,
        String dropoffAddress,
        String dropoffContactName,
        String dropoffContactPhone,
        String parcelDescription,
        ParcelSize parcelSize,
        BigDecimal weightKg,
        String deliveryInstructions,
        BigDecimal distanceKm,
        Long branchId,
        Instant createdAt,
        Instant updatedAt
) {

    public static OrderResponse from(DeliveryOrder order) {
        return new OrderResponse(
                order.getId(),
                order.getTrackingNumber(),
                order.getStatus(),
                order.getDeliveryFee(),
                order.getCurrency(),
                order.getPickupAddress(),
                order.getPickupContactName(),
                order.getPickupContactPhone(),
                order.getDropoffAddress(),
                order.getDropoffContactName(),
                order.getDropoffContactPhone(),
                order.getParcelDescription(),
                order.getParcelSize(),
                order.getWeightKg(),
                order.getDeliveryInstructions(),
                order.getDistanceKm(),
                order.getBranchId(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }
}
