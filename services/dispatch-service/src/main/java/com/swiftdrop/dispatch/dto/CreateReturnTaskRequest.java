package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateReturnTaskRequest {

    private String orderId;
    private String trackingNumber;
    private Long deliveryJobId;
    private Long exceptionId;

    @NotBlank(message = "Return-to-sender reason is required")
    private String reason;

    private Long currentBranchId;
    private String currentBranchCode;
    private String currentBranchName;
    private Long originBranchId;
    private String originBranchCode;
    private String originBranchName;
    private String returnToName;
    private String returnToPhone;
    private String returnAddress;
    private String notes;

    public CreateReturnTaskRequest() {
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public Long getDeliveryJobId() {
        return deliveryJobId;
    }

    public void setDeliveryJobId(Long deliveryJobId) {
        this.deliveryJobId = deliveryJobId;
    }

    public Long getExceptionId() {
        return exceptionId;
    }

    public void setExceptionId(Long exceptionId) {
        this.exceptionId = exceptionId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Long getCurrentBranchId() {
        return currentBranchId;
    }

    public void setCurrentBranchId(Long currentBranchId) {
        this.currentBranchId = currentBranchId;
    }

    public String getCurrentBranchCode() {
        return currentBranchCode;
    }

    public void setCurrentBranchCode(String currentBranchCode) {
        this.currentBranchCode = currentBranchCode;
    }

    public String getCurrentBranchName() {
        return currentBranchName;
    }

    public void setCurrentBranchName(String currentBranchName) {
        this.currentBranchName = currentBranchName;
    }

    public Long getOriginBranchId() {
        return originBranchId;
    }

    public void setOriginBranchId(Long originBranchId) {
        this.originBranchId = originBranchId;
    }

    public String getOriginBranchCode() {
        return originBranchCode;
    }

    public void setOriginBranchCode(String originBranchCode) {
        this.originBranchCode = originBranchCode;
    }

    public String getOriginBranchName() {
        return originBranchName;
    }

    public void setOriginBranchName(String originBranchName) {
        this.originBranchName = originBranchName;
    }

    public String getReturnToName() {
        return returnToName;
    }

    public void setReturnToName(String returnToName) {
        this.returnToName = returnToName;
    }

    public String getReturnToPhone() {
        return returnToPhone;
    }

    public void setReturnToPhone(String returnToPhone) {
        this.returnToPhone = returnToPhone;
    }

    public String getReturnAddress() {
        return returnAddress;
    }

    public void setReturnAddress(String returnAddress) {
        this.returnAddress = returnAddress;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

