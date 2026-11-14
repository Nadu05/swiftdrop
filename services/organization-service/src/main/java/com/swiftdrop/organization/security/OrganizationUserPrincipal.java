package com.swiftdrop.organization.security;

import java.util.List;

public record OrganizationUserPrincipal(
        String userId,
        String email,
        List<String> roles,
        Long branchId,
        String organizationId
) {
    public OrganizationUserPrincipal(String userId, String email, List<String> roles) {
        this(userId, email, roles, null, null);
    }

    public boolean hasRole(String role) {
        if (roles == null || role == null) {
            return false;
        }
        String normalized = role.startsWith("ROLE_") ? role.substring(5) : role;
        return roles.stream().anyMatch(r ->
                r.equalsIgnoreCase(normalized) || r.equalsIgnoreCase("ROLE_" + normalized));
    }

    public boolean isGlobalAdmin() {
        return hasRole("ADMIN") || hasRole("HEAD_OFFICE_ADMIN") || hasRole("INTERNAL_SERVICE");
    }

    public boolean isBranchManager() {
        return hasRole("BRANCH_MANAGER");
    }

    public boolean canManageBranch(Long targetBranchId) {
        if (isGlobalAdmin()) {
            return true;
        }
        if (!isBranchManager()) {
            return false;
        }
        return branchId != null && targetBranchId != null && branchId.equals(targetBranchId);
    }
}
