package com.swiftdrop.notification.service;

import com.swiftdrop.notification.entity.NotificationEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Default non-blocking log/audit delivery adapter for local & container deployments
 * when an external SMTP/SMS gateway is not configured.
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "false", matchIfMissing = true)
public class LoggingNotificationSender implements NotificationSenderPort {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationSender.class);

    @Override
    public void send(NotificationEntity notification) {
        log.info("[corr={}] Dispatched {} notification [{}] type={} to email={} user={} ref={}: {}",
                notification.getCorrelationId(),
                notification.getChannel(),
                notification.getNotificationCode(),
                notification.getNotificationType(),
                notification.getRecipientEmail(),
                notification.getRecipientUserId(),
                notification.getTrackingNumber() != null ? notification.getTrackingNumber() : notification.getApplicationCode(),
                notification.getTitle());
    }
}

