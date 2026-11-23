package com.swiftdrop.organization.dto;

import java.util.List;

/**
 * One-time OAuth 2.0 Client Credentials returned to the System Administrator immediately upon approval.
 * Never persisted in organization-service.
 */
public class MerchantProvisionedOAuthDto {

    private Long id;
    private String clientId;
    private String clientSecret;
    private String merchantId;
    private String tokenEndpoint;
    private List<String> scopes;
    private String status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

    public String getMerchantId() { return merchantId; }
    public void setMerchantId(String merchantId) { this.merchantId = merchantId; }

    public String getTokenEndpoint() { return tokenEndpoint; }
    public void setTokenEndpoint(String tokenEndpoint) { this.tokenEndpoint = tokenEndpoint; }

    public List<String> getScopes() { return scopes; }
    public void setScopes(List<String> scopes) { this.scopes = scopes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
