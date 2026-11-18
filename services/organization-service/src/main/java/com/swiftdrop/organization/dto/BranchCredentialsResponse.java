package com.swiftdrop.organization.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Combined Branch Manager credential status and credential email delivery status for a branch.
 * When {@code provisioned} is false (e.g., legacy branches), identity fields are null/false.
 * {@code temporaryPassword} is non-null only while {@code mustChangePassword} is true.
 */
public record BranchCredentialsResponse(
        Long branchId,
        boolean provisioned,
        UUID userId,
        String loginEmail,
        boolean mustChangePassword,
        String temporaryPassword,
        LocalDateTime passwordChangedAt,
        String credentialEmailStatus,
        LocalDateTime credentialEmailSentAt,
        String credentialEmailError
) {
}
