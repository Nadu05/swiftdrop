package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.enums.ParcelSize;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Payload of {@code POST /api/v1/orders}.
 *
 * <p>Limits mirror the {@code delivery_orders} columns and the frontend booking schema. The
 * customer id, tracking number, fee, branch and status are deliberately absent: they are decided
 * by the server. Strings are trimmed during deserialization (see {@code JacksonConfig}).
 *
 * <p>This object contains personal data (addresses, phone numbers); never log it.
 */
public record CreateOrderRequest(

        @NotBlank(message = "Pickup address is required")
        @Size(min = 5, max = 500, message = "Pickup address must be between 5 and 500 characters")
        String pickupAddress,

        @NotBlank(message = "Pickup contact name is required")
        @Size(min = 2, max = 150, message = "Pickup contact name must be between 2 and 150 characters")
        String pickupContactName,

        @NotBlank(message = "Pickup contact phone is required")
        @Pattern(regexp = PHONE_PATTERN, message = "Pickup contact phone is not a valid phone number")
        String pickupContactPhone,

        @NotBlank(message = "Delivery address is required")
        @Size(min = 5, max = 500, message = "Delivery address must be between 5 and 500 characters")
        String dropoffAddress,

        @NotBlank(message = "Delivery contact name is required")
        @Size(min = 2, max = 150, message = "Delivery contact name must be between 2 and 150 characters")
        String dropoffContactName,

        @NotBlank(message = "Delivery contact phone is required")
        @Pattern(regexp = PHONE_PATTERN, message = "Delivery contact phone is not a valid phone number")
        String dropoffContactPhone,

        @Size(max = 500, message = "Parcel description must be at most 500 characters")
        String parcelDescription,

        @NotNull(message = "Parcel size is required")
        ParcelSize parcelSize,

        @NotNull(message = "Weight is required")
        @DecimalMin(value = "0.01", message = "Weight must be greater than 0 kg")
        @DecimalMax(value = "100", message = "Weight cannot exceed 100 kg")
        @Digits(integer = 3, fraction = 2, message = "Weight can have at most 2 decimal places")
        BigDecimal weightKg,

        @Size(max = 1000, message = "Delivery instructions must be at most 1000 characters")
        String deliveryInstructions
) {

    /** Same rule as the frontend booking schema: optional +, then 7-15 digits/spaces/dashes/brackets. */
    public static final String PHONE_PATTERN = "^\\+?[0-9\\s\\-()]{7,15}$";
}
