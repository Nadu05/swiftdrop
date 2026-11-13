package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request payload for registering a merchant organization profile.
 *
 * <p><strong>identityUserId</strong> is optional and <strong>unverified</strong>: until JWT
 * validation exists, it is stored as a client-supplied reference only and must not be treated as
 * proof of identity. Once authentication is available, it should be derived from the verified
 * token subject instead of the request body.</p>
 *
 * <p>Status and review fields are intentionally absent: every new profile starts as PENDING.</p>
 */
public class MerchantRegistrationRequest {

    @Size(max = 100, message = "Identity user ID must be at most 100 characters")
    private String identityUserId;

    @NotBlank(message = "Business name is required")
    @Size(max = 255, message = "Business name must be at most 255 characters")
    private String businessName;

    @NotBlank(message = "Business registration number is required")
    @Size(max = 50, message = "Business registration number must be at most 50 characters")
    @Pattern(regexp = MerchantValidationPatterns.REGISTRATION_NUMBER,
            message = "Business registration number may contain only letters, numbers, spaces, '/', '-' and '.'")
    private String businessRegistrationNumber;

    @NotBlank(message = "Business type is required")
    @Size(max = 30, message = "Business type must be at most 30 characters")
    private String businessType;

    @NotBlank(message = "Contact person name is required")
    @Size(max = 255, message = "Contact person name must be at most 255 characters")
    private String contactPersonName;

    @NotBlank(message = "Contact email is required")
    @Email(message = "Contact email must be a valid email address")
    @Size(max = 255, message = "Contact email must be at most 255 characters")
    private String contactEmail;

    @NotBlank(message = "Contact phone is required")
    @Size(max = 50, message = "Contact phone must be at most 50 characters")
    @Pattern(regexp = MerchantValidationPatterns.PHONE,
            message = "Contact phone must be a valid phone number (e.g. +94 77 123 4567)")
    private String contactPhone;

    @NotBlank(message = "Business address line 1 is required")
    @Size(max = 500, message = "Business address line 1 must be at most 500 characters")
    private String businessAddressLine1;

    @Size(max = 500, message = "Business address line 2 must be at most 500 characters")
    private String businessAddressLine2;

    @NotBlank(message = "City is required")
    @Size(max = 255, message = "City must be at most 255 characters")
    private String city;

    public MerchantRegistrationRequest() {}

    public MerchantRegistrationRequest(
            String identityUserId,
            String businessName,
            String businessRegistrationNumber,
            String businessType,
            String contactPersonName,
            String contactEmail,
            String contactPhone,
            String businessAddressLine1,
            String businessAddressLine2,
            String city) {
        this.identityUserId = identityUserId;
        this.businessName = businessName;
        this.businessRegistrationNumber = businessRegistrationNumber;
        this.businessType = businessType;
        this.contactPersonName = contactPersonName;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.businessAddressLine1 = businessAddressLine1;
        this.businessAddressLine2 = businessAddressLine2;
        this.city = city;
    }

    // --- Getters and Setters ---

    public String getIdentityUserId() { return identityUserId; }
    public void setIdentityUserId(String identityUserId) { this.identityUserId = identityUserId; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getBusinessRegistrationNumber() { return businessRegistrationNumber; }
    public void setBusinessRegistrationNumber(String businessRegistrationNumber) { this.businessRegistrationNumber = businessRegistrationNumber; }

    public String getBusinessType() { return businessType; }
    public void setBusinessType(String businessType) { this.businessType = businessType; }

    public String getContactPersonName() { return contactPersonName; }
    public void setContactPersonName(String contactPersonName) { this.contactPersonName = contactPersonName; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getBusinessAddressLine1() { return businessAddressLine1; }
    public void setBusinessAddressLine1(String businessAddressLine1) { this.businessAddressLine1 = businessAddressLine1; }

    public String getBusinessAddressLine2() { return businessAddressLine2; }
    public void setBusinessAddressLine2(String businessAddressLine2) { this.businessAddressLine2 = businessAddressLine2; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
}

