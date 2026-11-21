package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class ReportExceptionRequest {

    @NotBlank(message = "Exception type is required")
    private String exceptionType;

    @NotBlank(message = "Exception description is required")
    private String description;

    private String orderId;
    private String trackingNumber;
    private Long manifestId;
    private Long deliveryJobId;
    private Long pickupTaskId;
    private Long returnTaskId;
    private Long branchId;
    private String branchCode;
    private String branchName;
    private String parcelReference;
    private String evidenceReference;

    public ReportExceptionRequest() {
    }

    public String getExceptionType() {
        return exceptionType;
    }

    public void setExceptionType(String exceptionType) {
        this.exceptionType = exceptionType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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

    public Long getManifestId() {
        return manifestId;
    }

    public void setManifestId(Long manifestId) {
        this.manifestId = manifestId;
    }

    public Long getDeliveryJobId() {
        return deliveryJobId;
    }

    public void setDeliveryJobId(Long deliveryJobId) {
        this.deliveryJobId = deliveryJobId;
    }

    public Long getPickupTaskId() {
        return pickupTaskId;
    }

    public void setPickupTaskId(Long pickupTaskId) {
        this.pickupTaskId = pickupTaskId;
    }

    public Long getReturnTaskId() {
        return returnTaskId;
    }

    public void setReturnTaskId(Long returnTaskId) {
        this.returnTaskId = returnTaskId;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public String getParcelReference() {
        return parcelReference;
    }

    public void setParcelReference(String parcelReference) {
        this.parcelReference = parcelReference;
    }

    public String getEvidenceReference() {
        return evidenceReference;
    }

    public void setEvidenceReference(String evidenceReference) {
        this.evidenceReference = evidenceReference;
    }
}

