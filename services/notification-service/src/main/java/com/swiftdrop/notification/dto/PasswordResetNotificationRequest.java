package com.swiftdrop.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswordResetNotificationRequest(
        @NotBlank(message = "Recipient email is required")
        @Email(message = "Recipient email must be valid")
        String recipientEmail,

        @NotBlank(message = "Reset token is required")
        String resetToken,

        String resetUrl
) {
}
