package com.swiftdrop.dispatch.dto;

import java.util.ArrayList;
import java.util.List;

public class ReturnTaskDto {
    private Long id;
    private String returnCode;
    private String orderId;
    private String trackingNumber;
    private String parcelReference;
    private Long deliveryJobId;
    private Long exceptionId;
    private Long currentBranchId;
    private String currentBranchCode;
    private String currentBranchName;
    private Long originBranchId;
    private String originBranchCode;
    private String originBranchName;
    private String returnToName;
    private String returnToPhone;
    private String returnAddress;
    private String reason;
    private String status;
    private String assignedCourierId;
    private String assignedCourierCode;
    private String assignedCourierName;
    private Long returnManifestId;
    private String movementNotes;
    private String senderConfirmedBy;
    private String senderConfirmationReference;
    private String initiatedById;
    private String initiatedByName;
    private String initiatedAt;
    private String assignedAt;
    private String dispatchedAt;
    private String arrivedOriginBranchAt;
    private String returnedAt;
    private List<CustodyRecordDto> custodyRecords = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReturnCode() {
        return returnCode;
    }

    public void setReturnCode(String returnCode) {
        this.returnCode = returnCode;
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

    public String getParcelReference() {
        return parcelReference;
    }

    public void setParcelReference(String parcelReference) {
        this.parcelReference = parcelReference;
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

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAssignedCourierId() {
        return assignedCourierId;
    }

    public void setAssignedCourierId(String assignedCourierId) {
        this.assignedCourierId = assignedCourierId;
    }

    public String getAssignedCourierCode() {
        return assignedCourierCode;
    }

    public void setAssignedCourierCode(String assignedCourierCode) {
        this.assignedCourierCode = assignedCourierCode;
    }

    public String getAssignedCourierName() {
        return assignedCourierName;
    }

    public void setAssignedCourierName(String assignedCourierName) {
        this.assignedCourierName = assignedCourierName;
    }

    public Long getReturnManifestId() {
        return returnManifestId;
    }

    public void setReturnManifestId(Long returnManifestId) {
        this.returnManifestId = returnManifestId;
    }

    public String getMovementNotes() {
        return movementNotes;
    }

    public void setMovementNotes(String movementNotes) {
        this.movementNotes = movementNotes;
    }

    public String getSenderConfirmedBy() {
        return senderConfirmedBy;
    }

    public void setSenderConfirmedBy(String senderConfirmedBy) {
        this.senderConfirmedBy = senderConfirmedBy;
    }

    public String getSenderConfirmationReference() {
        return senderConfirmationReference;
    }

    public void setSenderConfirmationReference(String senderConfirmationReference) {
        this.senderConfirmationReference = senderConfirmationReference;
    }

    public String getInitiatedById() {
        return initiatedById;
    }

    public void setInitiatedById(String initiatedById) {
        this.initiatedById = initiatedById;
    }

    public String getInitiatedByName() {
        return initiatedByName;
    }

    public void setInitiatedByName(String initiatedByName) {
        this.initiatedByName = initiatedByName;
    }

    public String getInitiatedAt() {
        return initiatedAt;
    }

    public void setInitiatedAt(String initiatedAt) {
        this.initiatedAt = initiatedAt;
    }

    public String getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(String assignedAt) {
        this.assignedAt = assignedAt;
    }

    public String getDispatchedAt() {
        return dispatchedAt;
    }

    public void setDispatchedAt(String dispatchedAt) {
        this.dispatchedAt = dispatchedAt;
    }

    public String getArrivedOriginBranchAt() {
        return arrivedOriginBranchAt;
    }

    public void setArrivedOriginBranchAt(String arrivedOriginBranchAt) {
        this.arrivedOriginBranchAt = arrivedOriginBranchAt;
    }

    public String getReturnedAt() {
        return returnedAt;
    }

    public void setReturnedAt(String returnedAt) {
        this.returnedAt = returnedAt;
    }

    public List<CustodyRecordDto> getCustodyRecords() {
        return custodyRecords;
    }

    public void setCustodyRecords(List<CustodyRecordDto> custodyRecords) {
        this.custodyRecords = custodyRecords;
    }
}

