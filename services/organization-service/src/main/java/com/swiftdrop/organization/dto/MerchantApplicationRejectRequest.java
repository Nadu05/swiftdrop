package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.NotBlank;

public class MerchantApplicationRejectRequest {

    @NotBlank(message = "Rejection reason is required")
    private String rejectionReason;

    private String reviewNotes;

    public MerchantApplicationRejectRequest() {}

    public MerchantApplicationRejectRequest(String rejectionReason, String reviewNotes) {
        this.rejectionReason = rejectionReason;
        this.reviewNotes = reviewNotes;
    }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getReviewNotes() { return reviewNotes; }
    public void setReviewNotes(String reviewNotes) { this.reviewNotes = reviewNotes; }
}

