package com.swiftdrop.dispatch.dto.courier;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Why a delivery could not be completed. Shown to the branch dispatcher. */
public record FailedDeliveryRequest(
        @NotBlank(message = "reason is required")
        @Size(max = 100, message = "reason must be at most 100 characters")
        String reason,

        @NotBlank(message = "notes are required")
        @Size(min = 5, max = 500, message = "notes must be 5 to 500 characters")
        String notes
) {
}
