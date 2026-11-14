package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.location.ValidCity;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Payload of {@code POST /api/v1/orders/quote}: the inputs the fee depends on. Street addresses are not needed
 * (and are ignored if sent); the pickup and delivery towns are chosen from {@code GET /api/v1/orders/cities}.
 */
public record QuoteRequest(

        @NotBlank(message = "Pickup city is required")
        @ValidCity(message = "Pickup city is not a supported city")
        String pickupCity,

        @NotBlank(message = "Delivery city is required")
        @ValidCity(message = "Delivery city is not a supported city")
        String dropoffCity,

        @NotNull(message = "Parcel size is required")
        ParcelSize parcelSize,

        @NotNull(message = "Weight is required")
        @DecimalMin(value = "0.01", message = "Weight must be greater than 0 kg")
        @DecimalMax(value = "100", message = "Weight cannot exceed 100 kg")
        @Digits(integer = 3, fraction = 2, message = "Weight can have at most 2 decimal places")
        BigDecimal weightKg
) {
}
