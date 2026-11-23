package com.swiftdrop.order.security;

import java.util.List;

public record OrderUserPrincipal(
        String userId,
        String email,
        String organizationId,
        List<String> roles,
        Long branchId,
        List<String> scopes
) {
    public OrderUserPrincipal(
            String userId,
            String email,
            String organizationId,
            List<String> roles,
            Long branchId
    ) {
        this(userId, email, organizationId, roles, branchId, List.of());
    }

    public OrderUserPrincipal(
            String userId,
            String email,
            String organizationId,
            List<String> roles
    ) {
        this(userId, email, organizationId, roles, null, List.of());
    }

    /**
     * Checks OAuth 2.0 scope authorization.
     * - For standard user session JWTs (`scopes` is empty), scope checks pass through to role-based RBAC.
     * - For OAuth 2.0 Client Credentials tokens (`scopes` is non-empty), the exact required scope must be present.
     */
    public boolean hasScope(String requiredScope) {
        if (scopes == null || scopes.isEmpty()) {
            return true;
        }
        return scopes.stream().anyMatch(s -> s.equalsIgnoreCase(requiredScope));
    }

    public boolean hasRole(String role) {
        if (roles == null || role == null) return false;
        String clean = role.startsWith("ROLE_") ? role.substring(5) : role;
        return roles.stream().anyMatch(r -> r.equalsIgnoreCase(clean) || r.equalsIgnoreCase("ROLE_" + clean));
    }

    public boolean isGlobalAdmin() {
        return hasRole("ADMIN") || hasRole("HEAD_OFFICE_ADMIN") || hasRole("INTERNAL_SERVICE");
    }

    public boolean isBranchScopedStaff() {
        return hasRole("BRANCH_MANAGER") || hasRole("BRANCH_ADMIN") || hasRole("BRANCH_STAFF") || hasRole("DISPATCHER");
    }

    public boolean canAccessOrderBranch(Long originBranchId, Long destinationBranchId) {
        if (isGlobalAdmin()) {
            return true;
        }
        if (!isBranchScopedStaff() || branchId == null) {
            return false;
        }
        return branchId.equals(originBranchId) || branchId.equals(destinationBranchId);
    }

    public boolean canManageOriginBranch(Long originBranchId) {
        if (isGlobalAdmin()) {
            return true;
        }
        if (!isBranchScopedStaff() || branchId == null || originBranchId == null) {
            return false;
        }
        return branchId.equals(originBranchId);
    }
}
