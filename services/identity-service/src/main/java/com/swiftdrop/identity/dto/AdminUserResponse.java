package com.swiftdrop.identity.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Safe administrative view of a user entity.
 * Excludes password hashes and sensitive token details.
 */
public class AdminUserResponse {

    private UUID userId;
    private String fullName;
    private String email;
    private String phone;
    private List<String> roles;
    private String accountStatus;
    private boolean emailVerified;
    private String authProvider;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime passwordChangedAt;

    public AdminUserResponse() {}

    public AdminUserResponse(UUID userId, String fullName, String email, String phone,
                             List<String> roles, String accountStatus, boolean emailVerified,
                             String authProvider, LocalDateTime createdAt, LocalDateTime updatedAt,
                             LocalDateTime passwordChangedAt) {
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.roles = roles;
        this.accountStatus = accountStatus;
        this.emailVerified = emailVerified;
        this.authProvider = authProvider;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.passwordChangedAt = passwordChangedAt;
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    public String getAccountStatus() { return accountStatus; }
    public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public String getAuthProvider() { return authProvider; }
    public void setAuthProvider(String authProvider) { this.authProvider = authProvider; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getPasswordChangedAt() { return passwordChangedAt; }
    public void setPasswordChangedAt(LocalDateTime passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }
}

