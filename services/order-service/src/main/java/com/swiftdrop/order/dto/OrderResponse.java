package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.pricing.FeeBreakdown;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Private (owner-only) view of an order, returned by create, list and get-by-id.
 * {@code status} is the status code (e.g. {@code PICKED_UP}); display labels are a UI concern.
 * {@code feeBreakdown} is what was actually charged; its parts add up to {@code deliveryFee}.
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
        Instant updatedAt,
        String pickupCity,
        String dropoffCity,
        FeeBreakdown feeBreakdown,
        String pickupProvince,
        String pickupDistrict,
        String dropoffProvince,
        String dropoffDistrict
) {

    /** For callers that do not know the provinces and districts (they are reported as absent). */
    public OrderResponse(Long id, String trackingNumber, OrderStatus status, BigDecimal deliveryFee, String currency,
                         String pickupAddress, String pickupContactName, String pickupContactPhone,
                         String dropoffAddress, String dropoffContactName, String dropoffContactPhone,
                         String parcelDescription, ParcelSize parcelSize, BigDecimal weightKg,
                         String deliveryInstructions, BigDecimal distanceKm, Long branchId, Instant createdAt,
                         Instant updatedAt, String pickupCity, String dropoffCity, FeeBreakdown feeBreakdown) {
        this(id, trackingNumber, status, deliveryFee, currency, pickupAddress, pickupContactName, pickupContactPhone,
                dropoffAddress, dropoffContactName, dropoffContactPhone, parcelDescription, parcelSize, weightKg,
                deliveryInstructions, distanceKm, branchId, createdAt, updatedAt, pickupCity, dropoffCity,
                feeBreakdown, null, null, null, null);
    }

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
                order.getUpdatedAt(),
                order.getPickupCity(),
                order.getDropoffCity(),
                new FeeBreakdown(order.getBaseFee(), order.getWeightFee(), order.getDistanceFee(),
                        order.getZoneSurcharge(), order.getDeliveryFee(), order.getCurrency()),
                order.getPickupProvince(),
                order.getPickupDistrict(),
                order.getDropoffProvince(),
                order.getDropoffDistrict()
        );
    }
}
