package com.swiftdrop.organization.security;

import java.util.List;

public record OrganizationUserPrincipal(
        String userId,
        String email,
        List<String> roles
) {}

