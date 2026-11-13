package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.pricing.FeeBreakdown;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Receipt data for the owner of an order. Every amount is the value <b>stored when the order was placed</b>
 * (never recalculated), so a receipt always matches what was charged even if the tariff has changed since.
 * {@code totalFee} equals the sum of the breakdown parts (enforced by the database).
 *
 * @param deliveredAt when the parcel was delivered; null until then
 */
public record ReceiptResponse(
        Long orderId,
        String trackingNumber,
        OrderStatus status,
        String statusLabel,
        Instant orderedAt,
        Instant deliveredAt,
        String pickupCity,
        String pickupAddress,
        String pickupContactName,
        String dropoffCity,
        String dropoffAddress,
        String dropoffContactName,
        String parcelDescription,
        ParcelSize parcelSize,
        BigDecimal weightKg,
        BigDecimal distanceKm,
        FeeBreakdown feeBreakdown,
        BigDecimal totalFee,
        String currency
) {

    public static ReceiptResponse of(DeliveryOrder order, Instant deliveredAt) {
        FeeBreakdown breakdown = new FeeBreakdown(order.getBaseFee(), order.getWeightFee(), order.getDistanceFee(),
                order.getZoneSurcharge(), order.getDeliveryFee(), order.getCurrency());
        return new ReceiptResponse(order.getId(), order.getTrackingNumber(), order.getStatus(),
                order.getStatus().label(), order.getCreatedAt(), deliveredAt,
                order.getPickupCity(), order.getPickupAddress(), order.getPickupContactName(),
                order.getDropoffCity(), order.getDropoffAddress(), order.getDropoffContactName(),
                order.getParcelDescription(), order.getParcelSize(), order.getWeightKg(), order.getDistanceKm(),
                breakdown, order.getDeliveryFee(), order.getCurrency());
    }
}
