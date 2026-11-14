package com.swiftdrop.notification.service;

import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.repository.NotificationRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class NotificationAuditHelper {

    private final NotificationRepository notificationRepository;

    public NotificationAuditHelper(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationEntity recordFailureInNewTx(NotificationEntity prototype, String errorMessage) {
        NotificationEntity failed = new NotificationEntity();
        failed.setNotificationCode(prototype.getNotificationCode());
        failed.setEventId(prototype.getEventId());
        failed.setEventType(prototype.getEventType());
        failed.setNotificationType(prototype.getNotificationType());
        failed.setChannel(prototype.getChannel());
        failed.setRecipientUserId(prototype.getRecipientUserId());
        failed.setRecipientEmail(prototype.getRecipientEmail());
        failed.setRecipientName(prototype.getRecipientName());
        failed.setTrackingNumber(prototype.getTrackingNumber());
        failed.setOrderId(prototype.getOrderId());
        failed.setApplicationCode(prototype.getApplicationCode());
        failed.setTitle(prototype.getTitle());
        failed.setMessage(prototype.getMessage());
        failed.setCorrelationId(prototype.getCorrelationId());
        failed.setStatus(NotificationEntity.STATUS_FAILED);
        failed.setAttemptCount(prototype.getAttemptCount());
        failed.setErrorMessage(truncate(errorMessage, 950));
        return notificationRepository.save(failed);
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}

