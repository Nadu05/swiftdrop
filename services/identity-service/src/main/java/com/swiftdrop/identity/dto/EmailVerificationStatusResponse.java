package com.swiftdrop.identity.dto;

import java.time.LocalDateTime;

public class EmailVerificationStatusResponse {

    private String email;
    private boolean emailVerified;
    private LocalDateTime emailVerifiedAt;

    public EmailVerificationStatusResponse() {}

    public EmailVerificationStatusResponse(String email, boolean emailVerified, LocalDateTime emailVerifiedAt) {
        this.email = email;
        this.emailVerified = emailVerified;
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public LocalDateTime getEmailVerifiedAt() { return emailVerifiedAt; }
    public void setEmailVerifiedAt(LocalDateTime emailVerifiedAt) { this.emailVerifiedAt = emailVerifiedAt; }
}

