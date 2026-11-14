package com.swiftdrop.order.security;

import java.util.List;

public record OrderUserPrincipal(
        String userId,
        String email,
        String organizationId,
        List<String> roles
) {
    public boolean hasRole(String role) {
        if (roles == null || role == null) return false;
        String clean = role.startsWith("ROLE_") ? role.substring(5) : role;
        return roles.stream().anyMatch(r -> r.equalsIgnoreCase(clean) || r.equalsIgnoreCase("ROLE_" + clean));
    }
}

