package com.swiftdrop.organization.dto;

public class MerchantApprovalStatusResponse {

    private String merchantId;
    private String status;
    private boolean approved;

    public MerchantApprovalStatusResponse() {
    }

    public MerchantApprovalStatusResponse(String merchantId, String status, boolean approved) {
        this.merchantId = merchantId;
        this.status = status;
        this.approved = approved;
    }

    public String getMerchantId() {
        return merchantId;
    }

    public void setMerchantId(String merchantId) {
        this.merchantId = merchantId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isApproved() {
        return approved;
    }

    public void setApproved(boolean approved) {
        this.approved = approved;
    }
}

