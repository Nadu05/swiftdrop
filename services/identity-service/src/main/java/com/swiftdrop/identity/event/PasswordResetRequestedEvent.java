package com.swiftdrop.identity.event;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Event published when a user requests a password reset.
 * Consumed by Notification Service to dispatch the reset email.
 */
public class PasswordResetRequestedEvent implements Serializable {

    private String eventType = "PasswordResetRequested";
    private String email;
    private String recipientEmail;
    private String resetToken;
    private LocalDateTime expiresAt;
    private String correlationId;

    public PasswordResetRequestedEvent() {}

    public PasswordResetRequestedEvent(String email, String resetToken, LocalDateTime expiresAt) {
        this.eventType = "PasswordResetRequested";
        this.email = email;
        this.recipientEmail = email;
        this.resetToken = resetToken;
        this.expiresAt = expiresAt;
    }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; this.recipientEmail = email; }

    public String getRecipientEmail() { return recipientEmail != null ? recipientEmail : email; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }
}
