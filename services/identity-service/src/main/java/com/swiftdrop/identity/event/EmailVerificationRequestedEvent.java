package com.swiftdrop.identity.event;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Event published when an email verification link is requested.
 * Consumed by Notification Service to dispatch the verification email.
 */
public class EmailVerificationRequestedEvent implements Serializable {

    private String email;
    private String verificationToken;
    private LocalDateTime expiresAt;

    public EmailVerificationRequestedEvent() {}

    public EmailVerificationRequestedEvent(String email, String verificationToken, LocalDateTime expiresAt) {
        this.email = email;
        this.verificationToken = verificationToken;
        this.expiresAt = expiresAt;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getVerificationToken() { return verificationToken; }
    public void setVerificationToken(String verificationToken) { this.verificationToken = verificationToken; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}

