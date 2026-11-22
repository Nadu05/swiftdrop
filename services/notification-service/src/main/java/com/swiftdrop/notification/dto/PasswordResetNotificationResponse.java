package com.swiftdrop.notification.dto;

import java.time.LocalDateTime;

public record PasswordResetNotificationResponse(
        String notificationCode,
        String status,
        String errorMessage,
        LocalDateTime sentAt
) {
}
