package com.swiftdrop.dispatch.client.courier;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** The fields of Order's ready-for-dispatch response that the courier portal keeps. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CourierOrderDetails(
        Long id,
        String trackingNumber,
        String priority,
        String recipientName,
        String recipientPhone,
        String deliveryAddress,
        String city,
        String merchantName,
        String merchantContact,
        String packageType,
        Double weightKg,
        String handlingNotes,
        String pickupAddress,
        String pickupCity
) {
}
