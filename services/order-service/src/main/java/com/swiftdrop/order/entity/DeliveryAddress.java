package com.swiftdrop.order.entity;

import jakarta.persistence.Embeddable;

/**
 * Value object representing a pickup or destination address and its contact details.
 */
@Embeddable
public class DeliveryAddress {

    private String address;
    private String city;
    private String postalCode;
    private Double latitude;
    private Double longitude;
    private String contactName;
    private String contactPhone;
    private String contactEmail;

    public DeliveryAddress() {
    }

    public DeliveryAddress(
            String address,
            String city,
            String postalCode,
            Double latitude,
            Double longitude,
            String contactName,
            String contactPhone,
            String contactEmail) {
        this.address = address;
        this.city = city;
        this.postalCode = postalCode;
        this.latitude = latitude;
        this.longitude = longitude;
        this.contactName = contactName;
        this.contactPhone = contactPhone;
        this.contactEmail = contactEmail;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }
}

