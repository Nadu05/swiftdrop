package com.swiftdrop.identity.event;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Event published when a user requests a password reset.
 * Consumed by Notification Service to dispatch the reset email.
 */
public class PasswordResetRequestedEvent implements Serializable {

    private String email;
    private String resetToken;
    private LocalDateTime expiresAt;

    public PasswordResetRequestedEvent() {}

    public PasswordResetRequestedEvent(String email, String resetToken, LocalDateTime expiresAt) {
        this.email = email;
        this.resetToken = resetToken;
        this.expiresAt = expiresAt;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}

