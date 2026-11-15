package com.swiftdrop.dispatch.dto;

import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for transitioning an assignment status.
 * Supports proof-of-delivery (POD) metadata when transitioning to DELIVERED,
 * and failure details when transitioning to FAILED.
 */
public class AssignmentStatusUpdateRequest {

    @NotNull(message = "New assignment status is required")
    private AssignmentStatus status;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    private String notes;

    private String recipientName;
    private ProofOfDeliveryType podType;
    private String confirmationDetails;
    private String podReference;
    private String photoUrl;
    private String failureReason;
    private Integer deliveryAttempts;

    public AssignmentStatusUpdateRequest() {
    }

    public AssignmentStatusUpdateRequest(AssignmentStatus status, String notes) {
        this.status = status;
        this.notes = notes;
    }

    public AssignmentStatusUpdateRequest(AssignmentStatus status, String notes,
                                         String recipientName, ProofOfDeliveryType podType,
                                         String confirmationDetails, String podReference,
                                         String photoUrl, String failureReason, Integer deliveryAttempts) {
        this.status = status;
        this.notes = notes;
        this.recipientName = recipientName;
        this.podType = podType;
        this.confirmationDetails = confirmationDetails;
        this.podReference = podReference;
        this.photoUrl = photoUrl;
        this.failureReason = failureReason;
        this.deliveryAttempts = deliveryAttempts;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public ProofOfDeliveryType getPodType() {
        return podType;
    }

    public void setPodType(ProofOfDeliveryType podType) {
        this.podType = podType;
    }

    public String getConfirmationDetails() {
        return confirmationDetails;
    }

    public void setConfirmationDetails(String confirmationDetails) {
        this.confirmationDetails = confirmationDetails;
    }

    public String getPodReference() {
        return podReference;
    }

    public void setPodReference(String podReference) {
        this.podReference = podReference;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public Integer getDeliveryAttempts() {
        return deliveryAttempts;
    }

    public void setDeliveryAttempts(Integer deliveryAttempts) {
        this.deliveryAttempts = deliveryAttempts;
    }
}
