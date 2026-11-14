package com.swiftdrop.identity.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public class AdminUpdateUserRequest {

    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    private String fullName;

    @Pattern(regexp = "^\\+?[0-9\\s\\-().]{7,20}$",
            message = "Phone number must be between 7 and 20 digits and can include '+', spaces, or dashes")
    private String phone;

    private List<String> roles;

    private String accountStatus;

    private Boolean emailVerified;

    private Long branchId;

    private String organizationId;

    public AdminUpdateUserRequest() {}

    public AdminUpdateUserRequest(String fullName, String phone, List<String> roles,
                                  String accountStatus, Boolean emailVerified) {
        this.fullName = fullName;
        this.phone = phone;
        this.roles = roles;
        this.accountStatus = accountStatus;
        this.emailVerified = emailVerified;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

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
}

