package com.swiftdrop.order.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class OrderQuoteRequest {

    @NotBlank(message = "Pickup address is required")
    private String pickupAddress;

    @DecimalMin(value = "-90.0", message = "Pickup latitude must be >= -90")
    @DecimalMax(value = "90.0", message = "Pickup latitude must be <= 90")
    private Double pickupLatitude;

    @DecimalMin(value = "-180.0", message = "Pickup longitude must be >= -180")
    @DecimalMax(value = "180.0", message = "Pickup longitude must be <= 180")
    private Double pickupLongitude;

    @NotBlank(message = "Dropoff address is required")
    private String dropoffAddress;

    @DecimalMin(value = "-90.0", message = "Destination latitude must be >= -90")
    @DecimalMax(value = "90.0", message = "Destination latitude must be <= 90")
    private Double destinationLatitude;

    @DecimalMin(value = "-180.0", message = "Destination longitude must be >= -180")
    @DecimalMax(value = "180.0", message = "Destination longitude must be <= 180")
    private Double destinationLongitude;

    @NotNull(message = "Parcel weight (weightKg) is required")
    @DecimalMin(value = "0.01", message = "Parcel weight must be greater than 0 kg")
    @DecimalMax(value = "500.00", message = "Parcel weight cannot exceed 500 kg")
    private BigDecimal weightKg;

    private String parcelSize = "MEDIUM";

    public OrderQuoteRequest() {
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public Double getPickupLatitude() {
        return pickupLatitude;
    }

    public void setPickupLatitude(Double pickupLatitude) {
        this.pickupLatitude = pickupLatitude;
    }

    public Double getPickupLongitude() {
        return pickupLongitude;
    }

    public void setPickupLongitude(Double pickupLongitude) {
        this.pickupLongitude = pickupLongitude;
    }

    public String getDropoffAddress() {
        return dropoffAddress;
    }

    public void setDropoffAddress(String dropoffAddress) {
        this.dropoffAddress = dropoffAddress;
    }

    public Double getDestinationLatitude() {
        return destinationLatitude;
    }

    public void setDestinationLatitude(Double destinationLatitude) {
        this.destinationLatitude = destinationLatitude;
    }

    public Double getDestinationLongitude() {
        return destinationLongitude;
    }

    public void setDestinationLongitude(Double destinationLongitude) {
        this.destinationLongitude = destinationLongitude;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public String getParcelSize() {
        return parcelSize;
    }

    public void setParcelSize(String parcelSize) {
        this.parcelSize = parcelSize;
    }
}

