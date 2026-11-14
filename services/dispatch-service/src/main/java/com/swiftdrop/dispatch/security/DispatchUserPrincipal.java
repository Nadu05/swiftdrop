package com.swiftdrop.dispatch.security;

import java.util.List;

public record DispatchUserPrincipal(
        String userId,
        String email,
        List<String> roles,
        Long branchId
) {
    public boolean hasRole(String role) {
        if (roles == null || role == null) {
            return false;
        }
        String normalized = role.startsWith("ROLE_") ? role.substring(5) : role;
        return roles.stream().anyMatch(r -> r.equalsIgnoreCase(normalized) || r.equalsIgnoreCase("ROLE_" + normalized));
    }

    public boolean isAdmin() {
        return hasRole("ADMIN");
    }

    public boolean isDispatcher() {
        return hasRole("DISPATCHER");
    }

    public boolean isCourier() {
        return hasRole("COURIER");
    }

    public boolean canManageBranch(Long targetBranchId) {
        if (isAdmin()) {
            return true;
        }
        if (!isDispatcher()) {
            return false;
        }
        if (branchId == null || targetBranchId == null) {
            return true;
        }
        return branchId.equals(targetBranchId);
    }
}
