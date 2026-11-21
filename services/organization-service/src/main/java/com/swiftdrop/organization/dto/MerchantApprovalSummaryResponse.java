package com.swiftdrop.organization.dto;

public class MerchantApprovalSummaryResponse {

    private long pendingReview;
    private long awaitingMerchant;
    private long approvedThisMonth;
    private long rejectedThisMonth;
    private long totalSubmissions;

    public MerchantApprovalSummaryResponse() {}

    public MerchantApprovalSummaryResponse(long pendingReview, long awaitingMerchant,
                                           long approvedThisMonth, long rejectedThisMonth,
                                           long totalSubmissions) {
        this.pendingReview = pendingReview;
        this.awaitingMerchant = awaitingMerchant;
        this.approvedThisMonth = approvedThisMonth;
        this.rejectedThisMonth = rejectedThisMonth;
        this.totalSubmissions = totalSubmissions;
    }

    public long getPendingReview() { return pendingReview; }
    public void setPendingReview(long pendingReview) { this.pendingReview = pendingReview; }

    public long getAwaitingMerchant() { return awaitingMerchant; }
    public void setAwaitingMerchant(long awaitingMerchant) { this.awaitingMerchant = awaitingMerchant; }

    public long getApprovedThisMonth() { return approvedThisMonth; }
    public void setApprovedThisMonth(long approvedThisMonth) { this.approvedThisMonth = approvedThisMonth; }

    public long getRejectedThisMonth() { return rejectedThisMonth; }
    public void setRejectedThisMonth(long rejectedThisMonth) { this.rejectedThisMonth = rejectedThisMonth; }

    public long getTotalSubmissions() { return totalSubmissions; }
    public void setTotalSubmissions(long totalSubmissions) { this.totalSubmissions = totalSubmissions; }
}

