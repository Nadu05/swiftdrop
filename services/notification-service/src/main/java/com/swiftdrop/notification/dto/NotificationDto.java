package com.swiftdrop.notification.dto;

import java.time.LocalDateTime;

public record NotificationDto(
        Long id,
        String notificationCode,
        String eventId,
        String eventType,
        String notificationType,
        String channel,
        String recipientUserId,
        String recipientEmail,
        String recipientName,
        String trackingNumber,
        String orderId,
        String applicationCode,
        String title,
        String message,
        String correlationId,
        String status,
        int attemptCount,
        String errorMessage,
        LocalDateTime readAt,
        LocalDateTime sentAt,
        LocalDateTime createdAt
) {
}

