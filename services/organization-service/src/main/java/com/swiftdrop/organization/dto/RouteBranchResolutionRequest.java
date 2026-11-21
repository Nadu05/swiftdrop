package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request payload for resolving both origin (pickup) and destination (delivery) branches
 * by postal code in a single operation.
 */
public class RouteBranchResolutionRequest {

    @NotBlank(message = "Pickup postal code is required")
    @Pattern(regexp = "^\\d{5}$", message = "Pickup postal code must be a 5-digit code")
    private String pickupPostalCode;

    @NotBlank(message = "Dropoff postal code is required")
    @Pattern(regexp = "^\\d{5}$", message = "Dropoff postal code must be a 5-digit code")
    private String dropoffPostalCode;

    public RouteBranchResolutionRequest() {}

    public RouteBranchResolutionRequest(String pickupPostalCode, String dropoffPostalCode) {
        this.pickupPostalCode = pickupPostalCode;
        this.dropoffPostalCode = dropoffPostalCode;
    }

    public String getPickupPostalCode() { return pickupPostalCode; }
    public void setPickupPostalCode(String pickupPostalCode) { this.pickupPostalCode = pickupPostalCode; }

    public String getDropoffPostalCode() { return dropoffPostalCode; }
    public void setDropoffPostalCode(String dropoffPostalCode) { this.dropoffPostalCode = dropoffPostalCode; }
}
