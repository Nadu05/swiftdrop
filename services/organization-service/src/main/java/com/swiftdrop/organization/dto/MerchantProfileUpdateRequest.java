package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.Size;

/**
 * Permitted non-sensitive profile fields that a merchant may update on their own profile
 * or when resubmitting an application with MORE_INFORMATION_REQUIRED status.
 */
public class MerchantProfileUpdateRequest {

    @Size(max = 150, message = "Contact full name must not exceed 150 characters")
    private String contactFullName;

    @Size(max = 100, message = "Contact designation must not exceed 100 characters")
    private String contactDesignation;

    @Size(max = 30, message = "Contact phone must not exceed 30 characters")
    private String contactPhone;

    @Size(max = 255, message = "Street address must not exceed 255 characters")
    private String streetAddress;

    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @Size(max = 100, message = "District must not exceed 100 characters")
    private String district;

    @Size(max = 20, message = "Postal code must not exceed 20 characters")
    private String postalCode;

    @Size(max = 50, message = "Expected daily volume must not exceed 50 characters")
    private String expectedDailyVolume;

    public String getContactFullName() {
        return contactFullName;
    }

    public void setContactFullName(String contactFullName) {
        this.contactFullName = contactFullName;
    }

    public String getContactDesignation() {
        return contactDesignation;
    }

    public void setContactDesignation(String contactDesignation) {
        this.contactDesignation = contactDesignation;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public String getStreetAddress() {
        return streetAddress;
    }

    public void setStreetAddress(String streetAddress) {
        this.streetAddress = streetAddress;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getExpectedDailyVolume() {
        return expectedDailyVolume;
    }

    public void setExpectedDailyVolume(String expectedDailyVolume) {
        this.expectedDailyVolume = expectedDailyVolume;
    }
}

