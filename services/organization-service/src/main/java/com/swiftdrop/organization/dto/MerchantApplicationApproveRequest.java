package com.swiftdrop.organization.dto;

public class MerchantApplicationApproveRequest {

    private String reviewNotes;

    public MerchantApplicationApproveRequest() {}

    public MerchantApplicationApproveRequest(String reviewNotes) {
        this.reviewNotes = reviewNotes;
    }

    public String getReviewNotes() { return reviewNotes; }
    public void setReviewNotes(String reviewNotes) { this.reviewNotes = reviewNotes; }
}

