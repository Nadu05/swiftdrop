package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request payload for resolving the active branch covering a parcel pickup postal code.
 */
public class BranchResolutionRequest {

    @NotBlank(message = "Postal code is required")
    @Pattern(regexp = "^\\d{5}$", message = "Postal code must be a 5-digit code")
    private String postalCode;

    public BranchResolutionRequest() {}

    public BranchResolutionRequest(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
}

