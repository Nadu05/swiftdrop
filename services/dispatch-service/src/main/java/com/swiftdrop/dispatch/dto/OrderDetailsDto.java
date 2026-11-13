package com.swiftdrop.dispatch.dto;

import java.time.LocalDateTime;

/**
 * DTO representing an order payload received from Order Service ready for dispatch.
 */
public class OrderDetailsDto {

    private Long id;
    private String orderNumber;
    private String trackingNumber;
    private Long branchId;
    private String recipientName;
    private String recipientPhone;
    private String deliveryAddress;
    private String city;
    private String merchantName;
    private String merchantContact;
    private String priority;
    private String packageType;
    private Double weightKg;
    private String dimensions;
    private String handlingNotes;
    private LocalDateTime createdAt;

    public OrderDetailsDto() {
    }

    public OrderDetailsDto(Long id, String orderNumber, String trackingNumber, Long branchId,
                           String recipientName, String recipientPhone, String deliveryAddress,
                           String city, String merchantName, String merchantContact,
                           String priority, String packageType, Double weightKg,
                           String dimensions, String handlingNotes, LocalDateTime createdAt) {
        this.id = id;
        this.orderNumber = orderNumber;
        this.trackingNumber = trackingNumber;
        this.branchId = branchId;
        this.recipientName = recipientName;
        this.recipientPhone = recipientPhone;
        this.deliveryAddress = deliveryAddress;
        this.city = city;
        this.merchantName = merchantName;
        this.merchantContact = merchantContact;
        this.priority = priority;
        this.packageType = packageType;
        this.weightKg = weightKg;
        this.dimensions = dimensions;
        this.handlingNotes = handlingNotes;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getRecipientPhone() {
        return recipientPhone;
    }

    public void setRecipientPhone(String recipientPhone) {
        this.recipientPhone = recipientPhone;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public String getMerchantContact() {
        return merchantContact;
    }

    public void setMerchantContact(String merchantContact) {
        this.merchantContact = merchantContact;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getPackageType() {
        return packageType;
    }

    public void setPackageType(String packageType) {
        this.packageType = packageType;
    }

    public Double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Double weightKg) {
        this.weightKg = weightKg;
    }

    public String getDimensions() {
        return dimensions;
    }

    public void setDimensions(String dimensions) {
        this.dimensions = dimensions;
    }

    public String getHandlingNotes() {
        return handlingNotes;
    }

    public void setHandlingNotes(String handlingNotes) {
        this.handlingNotes = handlingNotes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

