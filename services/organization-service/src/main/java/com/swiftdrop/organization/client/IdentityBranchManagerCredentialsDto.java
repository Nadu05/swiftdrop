package com.swiftdrop.organization.client;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mirrors identity-service's BranchManagerCredentialsResponse.
 */
public record IdentityBranchManagerCredentialsDto(
        UUID userId,
        Long branchId,
        String email,
        boolean mustChangePassword,
        String temporaryPassword,
        LocalDateTime passwordChangedAt
) {
}
