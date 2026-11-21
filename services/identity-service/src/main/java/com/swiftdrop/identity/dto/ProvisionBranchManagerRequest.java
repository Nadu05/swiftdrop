package com.swiftdrop.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for provisioning a BRANCH_MANAGER user account for a branch.
 */
public class ProvisionBranchManagerRequest {

    @NotNull(message = "Branch ID is required")
    private Long branchId;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String email;

    @Size(max = 150, message = "Full name cannot exceed 150 characters")
    private String fullName;

    @Size(max = 100, message = "Organization ID cannot exceed 100 characters")
    private String organizationId;

    public ProvisionBranchManagerRequest() {}

    public ProvisionBranchManagerRequest(Long branchId, String email, String fullName, String organizationId) {
        this.branchId = branchId;
        this.email = email;
        this.fullName = fullName;
        this.organizationId = organizationId;
    }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getOrganizationId() { return organizationId; }
    public void setOrganizationId(String organizationId) { this.organizationId = organizationId; }
}
