package com.swiftdrop.order.dto;

import com.swiftdrop.order.entity.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Staff/courier request to move an order to its next status. Only the new status is required.
 * {@code note} and {@code location} are kept in the private history; neither is shown on the public page.
 */
public record UpdateStatusRequest(
        @NotNull(message = "status is required")
        OrderStatus status,

        @Size(max = 1000, message = "note must be at most 1000 characters")
        String note,

        @Size(max = 255, message = "location must be at most 255 characters")
        String location
) {
}
