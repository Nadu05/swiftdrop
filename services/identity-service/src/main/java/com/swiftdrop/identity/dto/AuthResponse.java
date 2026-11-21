package com.swiftdrop.identity.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO returned after successful registration or login.
 * Never includes password hashes or sensitive internals.
 */
public class AuthResponse {

    private UUID userId;
    private String fullName;
    private String email;
    private String phone;
    private List<String> roles;
    private String accountStatus;
    private boolean emailVerified;
    private LocalDateTime createdAt;
    private Long branchId;
    private String organizationId;
    private boolean mustChangePassword;

    // --- Constructor ---

    public AuthResponse() {}

    public AuthResponse(UUID userId, String fullName, String email, String phone,
                        List<String> roles, String accountStatus, LocalDateTime createdAt) {
        this(userId, fullName, email, phone, roles, accountStatus, false, createdAt);
    }

    public AuthResponse(UUID userId, String fullName, String email, String phone,
                        List<String> roles, String accountStatus, boolean emailVerified, LocalDateTime createdAt) {
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.roles = roles;
        this.accountStatus = accountStatus;
        this.emailVerified = emailVerified;
        this.createdAt = createdAt;
    }

    // --- Getters and Setters ---

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getOrganizationId() { return organizationId; }
    public void setOrganizationId(String organizationId) { this.organizationId = organizationId; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }
}

