package com.swiftdrop.identity.dto;

/**
 * Returned ONCE on initial provisioning or credential rotation.
 * The plain-text clientSecret is never stored and cannot be retrieved again.
 */
public class OAuthClientProvisionedResponse extends OAuthClientResponse {

    private String clientSecret;

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }
}
