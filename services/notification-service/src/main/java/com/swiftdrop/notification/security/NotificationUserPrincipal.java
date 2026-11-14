package com.swiftdrop.notification.security;

import java.util.List;

public record NotificationUserPrincipal(
        String userId,
        String email,
        List<String> roles,
        Long branchId
) {
    public NotificationUserPrincipal(String userId, String email, List<String> roles) {
        this(userId, email, roles, null);
    }

    public boolean hasRole(String role) {
        if (roles == null || role == null) return false;
        String target = role.toUpperCase();
        return roles.stream()
                .map(r -> r.replace("ROLE_", "").toUpperCase())
                .anyMatch(target::equals);
    }

    public boolean isGlobalAdmin() {
        return hasRole("HEAD_OFFICE_ADMIN") || hasRole("ADMIN") || hasRole("INTERNAL_SERVICE");
    }

    public boolean isStaff() {
        return isGlobalAdmin()
                || hasRole("BRANCH_MANAGER")
                || hasRole("BRANCH_STAFF")
                || hasRole("DISPATCHER");
    }
}

