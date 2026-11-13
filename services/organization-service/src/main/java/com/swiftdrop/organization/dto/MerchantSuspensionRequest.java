package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for suspending an APPROVED merchant.
 */
public class MerchantSuspensionRequest {

    @NotBlank(message = "Suspension reason is required")
    @Size(max = 1000, message = "Suspension reason must be at most 1000 characters")
    private String reason;

    public MerchantSuspensionRequest() {}

    public MerchantSuspensionRequest(String reason) { this.reason = reason; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}

