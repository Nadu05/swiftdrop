package com.swiftdrop.dispatch.dto.courier;

import jakarta.validation.constraints.NotNull;

/** Courier going online (AVAILABLE) or offline (OFFLINE). */
public record AvailabilityUpdateRequest(
        @NotNull(message = "online is required")
        Boolean online
) {
}
