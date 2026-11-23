package com.swiftdrop.identity.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public class OAuthClientProvisionRequest {

    @NotBlank(message = "Merchant ID is required")
    private String merchantId;

    @NotBlank(message = "Merchant name is required")
    private String merchantName;

    private List<String> scopes;

    public String getMerchantId() { return merchantId; }
    public void setMerchantId(String merchantId) { this.merchantId = merchantId; }

    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }

    public List<String> getScopes() { return scopes; }
    public void setScopes(List<String> scopes) { this.scopes = scopes; }
}
