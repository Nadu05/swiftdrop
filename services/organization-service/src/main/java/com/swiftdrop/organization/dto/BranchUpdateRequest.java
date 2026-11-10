package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.*;

/**
 * Request DTO for partially updating an existing branch.
 * All fields are optional; only provided (non-null) fields will be applied.
 * Clients cannot modify id, createdAt, or updatedAt through this DTO.
 */
public class BranchUpdateRequest {

    @Size(max = 50, message = "Branch code must be at most 50 characters")
    private String code;

    @Size(max = 255, message = "Branch name must be at most 255 characters")
    private String name;

    @Size(max = 500, message = "Address line 1 must be at most 500 characters")
    private String addressLine1;

    @Size(max = 500, message = "Address line 2 must be at most 500 characters")
    private String addressLine2;

    @Size(max = 255, message = "City must be at most 255 characters")
    private String city;

    @Size(max = 50, message = "Phone must be at most 50 characters")
    private String phone;

    @Email(message = "Email must be a valid email address")
    @Size(max = 255, message = "Email must be at most 255 characters")
    private String email;

    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private Double longitude;

    @Size(max = 20, message = "Status must be at most 20 characters")
    private String status;

    public BranchUpdateRequest() {}

    // --- Getters and Setters ---

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }

    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

