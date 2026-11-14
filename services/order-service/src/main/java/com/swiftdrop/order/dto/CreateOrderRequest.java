package com.swiftdrop.order.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CreateOrderRequest {

    private String orderSourceType = "CUSTOMER";
    private String merchantOrganizationId;
    private String pickupMethod = "COURIER_PICKUP";
    private String paymentMethod = "PREPAID";

    @DecimalMin(value = "0.00", message = "COD collection amount cannot be negative")
    private BigDecimal codAmount = BigDecimal.ZERO;

    private String quoteReference;
    private String paymentConfirmationToken;

    @NotBlank(message = "Pickup address is required")
    private String pickupAddress;

    private String pickupCity;
    private String pickupPostalCode;

    @DecimalMin(value = "-90.0", message = "Pickup latitude must be >= -90")
    @DecimalMax(value = "90.0", message = "Pickup latitude must be <= 90")
    private Double pickupLatitude;

    @DecimalMin(value = "-180.0", message = "Pickup longitude must be >= -180")
    @DecimalMax(value = "180.0", message = "Pickup longitude must be <= 180")
    private Double pickupLongitude;

    @NotBlank(message = "Pickup contact name is required")
    private String pickupContactName;

    @NotBlank(message = "Pickup contact phone is required")
    private String pickupContactPhone;

    private String pickupContactEmail;

    @NotBlank(message = "Dropoff address is required")
    private String dropoffAddress;

    private String dropoffCity;
    private String dropoffPostalCode;

    @DecimalMin(value = "-90.0", message = "Destination latitude must be >= -90")
    @DecimalMax(value = "90.0", message = "Destination latitude must be <= 90")
    private Double destinationLatitude;

    @DecimalMin(value = "-180.0", message = "Destination longitude must be >= -180")
    @DecimalMax(value = "180.0", message = "Destination longitude must be <= 180")
    private Double destinationLongitude;

    @NotBlank(message = "Dropoff contact name is required")
    private String dropoffContactName;

    @NotBlank(message = "Dropoff contact phone is required")
    private String dropoffContactPhone;

    private String dropoffContactEmail;

    @NotBlank(message = "Parcel description is required")
    private String parcelDescription;

    @NotBlank(message = "Parcel size is required")
    private String parcelSize = "MEDIUM";

    @NotNull(message = "Parcel weight (weightKg) is required")
    @DecimalMin(value = "0.01", message = "Parcel weight must be greater than 0 kg")
    @DecimalMax(value = "500.00", message = "Parcel weight cannot exceed 500 kg")
    private BigDecimal weightKg;

    private Boolean fragile = false;
    private BigDecimal declaredValue;
    private String deliveryInstructions;

    public String getOrderSourceType() {
        return orderSourceType;
    }

    public void setOrderSourceType(String orderSourceType) {
        this.orderSourceType = orderSourceType;
    }

    public String getMerchantOrganizationId() {
        return merchantOrganizationId;
    }

    public void setMerchantOrganizationId(String merchantOrganizationId) {
        this.merchantOrganizationId = merchantOrganizationId;
    }

    public String getPickupMethod() {
        return pickupMethod;
    }

    public void setPickupMethod(String pickupMethod) {
        this.pickupMethod = pickupMethod;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public BigDecimal getCodAmount() {
        return codAmount;
    }

    public void setCodAmount(BigDecimal codAmount) {
        this.codAmount = codAmount;
    }

    public String getQuoteReference() {
        return quoteReference;
    }

    public void setQuoteReference(String quoteReference) {
        this.quoteReference = quoteReference;
    }

    public String getPaymentConfirmationToken() {
        return paymentConfirmationToken;
    }

    public void setPaymentConfirmationToken(String paymentConfirmationToken) {
        this.paymentConfirmationToken = paymentConfirmationToken;
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public String getPickupCity() {
        return pickupCity;
    }

    public void setPickupCity(String pickupCity) {
        this.pickupCity = pickupCity;
    }

    public String getPickupPostalCode() {
        return pickupPostalCode;
    }

    public void setPickupPostalCode(String pickupPostalCode) {
        this.pickupPostalCode = pickupPostalCode;
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

    public String getPickupContactName() {
        return pickupContactName;
    }

    public void setPickupContactName(String pickupContactName) {
        this.pickupContactName = pickupContactName;
    }

    public String getPickupContactPhone() {
        return pickupContactPhone;
    }

    public void setPickupContactPhone(String pickupContactPhone) {
        this.pickupContactPhone = pickupContactPhone;
    }

    public String getPickupContactEmail() {
        return pickupContactEmail;
    }

    public void setPickupContactEmail(String pickupContactEmail) {
        this.pickupContactEmail = pickupContactEmail;
    }

    public String getDropoffAddress() {
        return dropoffAddress;
    }

    public void setDropoffAddress(String dropoffAddress) {
        this.dropoffAddress = dropoffAddress;
    }

    public String getDropoffCity() {
        return dropoffCity;
    }

    public void setDropoffCity(String dropoffCity) {
        this.dropoffCity = dropoffCity;
    }

    public String getDropoffPostalCode() {
        return dropoffPostalCode;
    }

    public void setDropoffPostalCode(String dropoffPostalCode) {
        this.dropoffPostalCode = dropoffPostalCode;
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

    public String getDropoffContactName() {
        return dropoffContactName;
    }

    public void setDropoffContactName(String dropoffContactName) {
        this.dropoffContactName = dropoffContactName;
    }

    public String getDropoffContactPhone() {
        return dropoffContactPhone;
    }

    public void setDropoffContactPhone(String dropoffContactPhone) {
        this.dropoffContactPhone = dropoffContactPhone;
    }

    public String getDropoffContactEmail() {
        return dropoffContactEmail;
    }

    public void setDropoffContactEmail(String dropoffContactEmail) {
        this.dropoffContactEmail = dropoffContactEmail;
    }

    public String getParcelDescription() {
        return parcelDescription;
    }

    public void setParcelDescription(String parcelDescription) {
        this.parcelDescription = parcelDescription;
    }

    public String getParcelSize() {
        return parcelSize;
    }

    public void setParcelSize(String parcelSize) {
        this.parcelSize = parcelSize;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public Boolean getFragile() {
        return fragile;
    }

    public void setFragile(Boolean fragile) {
        this.fragile = fragile;
    }

    public BigDecimal getDeclaredValue() {
        return declaredValue;
    }

    public void setDeclaredValue(BigDecimal declaredValue) {
        this.declaredValue = declaredValue;
    }

    public String getDeliveryInstructions() {
        return deliveryInstructions;
    }

    public void setDeliveryInstructions(String deliveryInstructions) {
        this.deliveryInstructions = deliveryInstructions;
    }
}

