package com.swiftdrop.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record TestEmailRequest(
        @NotBlank(message = "Recipient email is required")
        @Email(message = "Valid recipient email format is required")
        String recipientEmail
) {}
