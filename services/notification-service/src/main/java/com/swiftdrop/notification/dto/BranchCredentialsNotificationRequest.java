package com.swiftdrop.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record BranchCredentialsNotificationRequest(
        @NotBlank(message = "Recipient email is required")
        @Email(message = "Recipient email must be valid")
        String recipientEmail,

        @NotBlank(message = "Branch name is required")
        String branchName,

        @NotBlank(message = "Branch code is required")
        String branchCode,

        @NotBlank(message = "Login email is required")
        @Email(message = "Login email must be valid")
        String loginEmail,

        @NotBlank(message = "Temporary password is required")
        String temporaryPassword
) {
}
