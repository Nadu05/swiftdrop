package com.swiftdrop.identity.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for Branch Manager credential provisioning, lookup, and reset.
 * temporaryPassword is present only while mustChangePassword is true; otherwise null.
 */
public class BranchManagerCredentialsResponse {

    private UUID userId;
    private Long branchId;
    private String email;
    private boolean mustChangePassword;
    private String temporaryPassword;
    private LocalDateTime passwordChangedAt;

    public BranchManagerCredentialsResponse() {}

    public BranchManagerCredentialsResponse(UUID userId,
                                            Long branchId,
                                            String email,
                                            boolean mustChangePassword,
                                            String temporaryPassword,
                                            LocalDateTime passwordChangedAt) {
        this.userId = userId;
        this.branchId = branchId;
        this.email = email;
        this.mustChangePassword = mustChangePassword;
        this.temporaryPassword = temporaryPassword;
        this.passwordChangedAt = passwordChangedAt;
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public String getTemporaryPassword() { return temporaryPassword; }
    public void setTemporaryPassword(String temporaryPassword) { this.temporaryPassword = temporaryPassword; }

    public LocalDateTime getPasswordChangedAt() { return passwordChangedAt; }
    public void setPasswordChangedAt(LocalDateTime passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }
}
