package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.DeliveryOrder;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * One order waiting for a courier, in the exact shape the Dispatch service reads ({@code OrderDetailsDto}),
 * so the field names here must not be changed without agreeing it with the Dispatch owner.
 *
 * <p>This holds the recipient's name, phone and address, so it is only ever returned to authorised staff or
 * services, never to customers or the public.
 *
 * <p>Mapping from the order: {@code recipient*} and {@code deliveryAddress} are the delivery contact and address;
 * {@code merchantName}/{@code merchantContact} are the pickup (sender) contact; {@code packageType} is the parcel
 * size; {@code handlingNotes} are the delivery instructions; {@code orderNumber} is the tracking number (there is
 * no separate order number). Not collected, so null: {@code dimensions}. {@code priority} is always STANDARD.
 * {@code createdAt} is UTC.
 *
 * <p>{@code pickupAddress} and {@code pickupCity} are <b>extra</b> fields that Dispatch's current DTO does not declare, so
 * its client ignores them; they let a courier see where to collect the parcel as soon as Dispatch adds the two fields.
 */
public record ReadyForDispatchResponse(
        Long id,
        String orderNumber,
        String trackingNumber,
        Long branchId,
        String recipientName,
        String recipientPhone,
        String deliveryAddress,
        String city,
        String merchantName,
        String merchantContact,
        String priority,
        String packageType,
        Double weightKg,
        String dimensions,
        String handlingNotes,
        LocalDateTime createdAt,
        String pickupAddress,
        String pickupCity
) {

    public static final String STANDARD_PRIORITY = "STANDARD";

    /**
     * @param cityName       display name of the delivery town; null for old orders without a town
     * @param pickupCityName display name of the pickup town; null for old orders without a town
     */
    public static ReadyForDispatchResponse from(DeliveryOrder order, String cityName, String pickupCityName) {
        return new ReadyForDispatchResponse(
                order.getId(),
                order.getTrackingNumber(),
                order.getTrackingNumber(),
                order.getBranchId(),
                order.getDropoffContactName(),
                order.getDropoffContactPhone(),
                order.getDropoffAddress(),
                cityName,
                order.getPickupContactName(),
                order.getPickupContactPhone(),
                STANDARD_PRIORITY,
                order.getParcelSize().name(),
                order.getWeightKg() == null ? null : order.getWeightKg().doubleValue(),
                null,
                order.getDeliveryInstructions(),
                LocalDateTime.ofInstant(order.getCreatedAt(), ZoneOffset.UTC),
                order.getPickupAddress(),
                pickupCityName);
    }
}
