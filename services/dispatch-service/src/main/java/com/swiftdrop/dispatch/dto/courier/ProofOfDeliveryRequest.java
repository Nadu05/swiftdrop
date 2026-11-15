package com.swiftdrop.dispatch.dto.courier;

import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Proof that a parcel was delivered. Only a reference is accepted (OTP code, signature id, photo
 * reference); media files are not uploaded here. An OTP must be 4 to 6 digits (checked in the service).
 */
public record ProofOfDeliveryRequest(
        @NotNull(message = "type is required")
        ProofOfDeliveryType type,

        @NotBlank(message = "reference is required")
        @Size(max = 100, message = "reference must be at most 100 characters")
        String reference,

        @NotBlank(message = "receivedBy is required")
        @Size(min = 2, max = 120, message = "receivedBy must be 2 to 120 characters")
        String receivedBy
) {
}
