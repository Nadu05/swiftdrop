package com.swiftdrop.notification.dto;

import java.time.LocalDateTime;

/**
 * Redacted DTO for unauthenticated public tracking milestone notifications.
 * Omits recipientName, recipientEmail, recipientUserId, orderId, eventId, correlationId, and raw PII message.
 */
public record PublicTrackingNotificationDto(
        String trackingNumber,
        String eventType,
        String notificationType,
        String channel,
        String title,
        String deliveryStatus,
        LocalDateTime sentAt,
        LocalDateTime createdAt
) {
}

