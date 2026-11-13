package com.swiftdrop.dispatch.dto;

import java.time.LocalDateTime;

/**
 * DTO representing an unassigned delivery available for courier assignment.
 * Compatible with the frontend UnassignedDelivery contract.
 */
public class UnassignedDeliveryResponse {

    private Long orderId;
    private String orderNumber;
    private String trackingNumber;
    private String recipientName;
    private String recipientPhone;
    private String deliveryAddress;
    private String city;
    private String merchantName;
    private String merchantContact;
    private LocalDateTime orderDate;
    private String priority;
    private ParcelInfoDto parcelInfo;

    public UnassignedDeliveryResponse() {
    }

    public UnassignedDeliveryResponse(Long orderId, String orderNumber, String trackingNumber,
                                      String recipientName, String recipientPhone,
                                      String deliveryAddress, String city,
                                      String merchantName, String merchantContact,
                                      LocalDateTime orderDate, String priority,
                                      ParcelInfoDto parcelInfo) {
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.trackingNumber = trackingNumber;
        this.recipientName = recipientName;
        this.recipientPhone = recipientPhone;
        this.deliveryAddress = deliveryAddress;
        this.city = city;
        this.merchantName = merchantName;
        this.merchantContact = merchantContact;
        this.orderDate = orderDate;
        this.priority = priority;
        this.parcelInfo = parcelInfo;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
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

    public LocalDateTime getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDateTime orderDate) {
        this.orderDate = orderDate;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public ParcelInfoDto getParcelInfo() {
        return parcelInfo;
    }

    public void setParcelInfo(ParcelInfoDto parcelInfo) {
        this.parcelInfo = parcelInfo;
    }
}

