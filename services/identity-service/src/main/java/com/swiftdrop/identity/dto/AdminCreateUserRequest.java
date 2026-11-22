package com.swiftdrop.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public class AdminCreateUserRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$",
            message = "Password must contain at least one uppercase letter, one digit, and one special character")
    private String password;

    @Pattern(regexp = "^\\+?[0-9\\s\\-().]{7,20}$",
            message = "Phone number must be between 7 and 20 digits and can include '+', spaces, or dashes")
    private String phone;

    private List<String> roles;

    private String accountStatus;

    private Boolean emailVerified;

    private Long branchId;

    private String organizationId;

    private Boolean mustChangePassword;

    public AdminCreateUserRequest() {}

    public AdminCreateUserRequest(String fullName, String email, String password, String phone,
                                  List<String> roles, String accountStatus, Boolean emailVerified) {
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.phone = phone;
        this.roles = roles;
        this.accountStatus = accountStatus;
        this.emailVerified = emailVerified;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    public String getAccountStatus() { return accountStatus; }
    public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }

    public Boolean getEmailVerified() { return emailVerified; }
    public void setEmailVerified(Boolean emailVerified) { this.emailVerified = emailVerified; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getOrganizationId() { return organizationId; }
    public void setOrganizationId(String organizationId) { this.organizationId = organizationId; }

    public Boolean getMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }
}

