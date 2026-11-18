package com.swiftdrop.notification.service;

import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.exception.NotificationDeliveryException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * SMTP email delivery adapter using Spring Boot's {@link JavaMailSender}.
 * Enabled when {@code app.mail.enabled=true}; otherwise {@link LoggingNotificationSender} is used.
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true")
public class SmtpNotificationSender implements NotificationSenderPort {

    private static final Logger log = LoggerFactory.getLogger(SmtpNotificationSender.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public SmtpNotificationSender(
            JavaMailSender mailSender,
            @Value("${app.mail.from:noreply@swiftdrop.lk}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void send(NotificationEntity notification) {
        String recipient = notification.getRecipientEmail();
        if (recipient == null || recipient.isBlank()) {
            throw new NotificationDeliveryException("Recipient email is required for SMTP delivery");
        }

        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(fromAddress);
        mail.setTo(recipient.trim());
        mail.setSubject(notification.getTitle());
        mail.setText(notification.getMessage());

        try {
            mailSender.send(mail);
            log.info("[corr={}] Sent SMTP email [{}] type={} to={}",
                    notification.getCorrelationId(),
                    notification.getNotificationCode(),
                    notification.getNotificationType(),
                    recipient.trim());
        } catch (MailException ex) {
            throw new NotificationDeliveryException("Failed to send email to " + recipient.trim() + ": " + ex.getMessage(), ex);
        }
    }
}
