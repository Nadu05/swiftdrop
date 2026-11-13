package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for rejecting a PENDING merchant application.
 */
public class MerchantRejectionRequest {

    @NotBlank(message = "Rejection reason is required")
    @Size(max = 1000, message = "Rejection reason must be at most 1000 characters")
    private String reason;

    public MerchantRejectionRequest() {}

    public MerchantRejectionRequest(String reason) { this.reason = reason; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}

