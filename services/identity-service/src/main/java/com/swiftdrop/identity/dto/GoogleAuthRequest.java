package com.swiftdrop.identity.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for Google OAuth authentication.
 * The client obtains the ID token via Google's client-side SDK and sends it here.
 * The backend verifies the token with Google's public keys.
 */
public class GoogleAuthRequest {

    @NotBlank(message = "Google ID token is required")
    private String idToken;

    // --- Getters and Setters ---

    public String getIdToken() { return idToken; }
    public void setIdToken(String idToken) { this.idToken = idToken; }
}

