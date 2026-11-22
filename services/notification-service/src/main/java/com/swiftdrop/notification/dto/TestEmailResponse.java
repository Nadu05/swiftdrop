package com.swiftdrop.notification.dto;

import java.time.LocalDateTime;

public record TestEmailResponse(
        boolean success,
        String message,
        String recipientEmail,
        String notificationCode,
        String status,
        LocalDateTime timestamp
) {}
