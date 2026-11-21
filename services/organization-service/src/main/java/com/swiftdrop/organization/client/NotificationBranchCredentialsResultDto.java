package com.swiftdrop.organization.client;

import java.time.LocalDateTime;

/**
 * Mirrors notification-service's BranchCredentialsNotificationResponse.
 */
public record NotificationBranchCredentialsResultDto(
        String notificationCode,
        String status,
        String errorMessage,
        LocalDateTime sentAt
) {
}
