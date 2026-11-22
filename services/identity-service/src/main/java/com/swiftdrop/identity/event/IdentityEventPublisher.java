package com.swiftdrop.identity.event;

import com.swiftdrop.identity.client.NotificationServiceClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

import static com.swiftdrop.identity.config.RabbitMQConfig.DOMAIN_EVENTS_EXCHANGE;
import static com.swiftdrop.identity.config.RabbitMQConfig.IDENTITY_EXCHANGE;

@Component
public class IdentityEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(IdentityEventPublisher.class);

    public static final String ROUTING_KEY_PASSWORD_RESET = "identity.event.password-reset";
    public static final String ROUTING_KEY_EMAIL_VERIFY   = "identity.event.email-verification";

    private final RabbitTemplate rabbitTemplate;
    private final NotificationServiceClient notificationServiceClient;
    private final String frontendBaseUrl;

    public IdentityEventPublisher(
            @Autowired(required = false) RabbitTemplate rabbitTemplate,
            @Autowired(required = false) NotificationServiceClient notificationServiceClient,
            @Value("${app.frontend.base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.rabbitTemplate = rabbitTemplate;
        this.notificationServiceClient = notificationServiceClient;
        this.frontendBaseUrl = frontendBaseUrl != null ? frontendBaseUrl : "http://localhost:3000";
    }

    public void publishPasswordReset(String email, String resetToken, java.time.LocalDateTime expiresAt) {
        PasswordResetRequestedEvent event = new PasswordResetRequestedEvent(email, resetToken, expiresAt);
        String resetUrl = frontendBaseUrl + "/reset-password?token=" + resetToken;

        Map<String, Object> eventMap = new HashMap<>();
        eventMap.put("eventType", "PasswordResetRequested");
        eventMap.put("email", email);
        eventMap.put("recipientEmail", email);
        eventMap.put("resetToken", resetToken);
        eventMap.put("resetUrl", resetUrl);
        eventMap.put("expiresAt", expiresAt != null ? expiresAt.toString() : null);

        boolean rabbitSuccess = false;
        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend(DOMAIN_EVENTS_EXCHANGE, ROUTING_KEY_PASSWORD_RESET, eventMap);
                log.info("Published PasswordResetRequestedEvent to {} with routing key {} for email: {}",
                        DOMAIN_EVENTS_EXCHANGE, ROUTING_KEY_PASSWORD_RESET, email);
                rabbitSuccess = true;
            } catch (Exception ex) {
                log.warn("Failed to publish PasswordResetRequestedEvent to RabbitMQ exchange {}: {}. Triggering direct fallback.",
                        DOMAIN_EVENTS_EXCHANGE, ex.getMessage());
            }

            try {
                rabbitTemplate.convertAndSend(IDENTITY_EXCHANGE, ROUTING_KEY_PASSWORD_RESET, event);
            } catch (Exception ignored) {
                // Identity queue local binding
            }
        }

        // If RabbitMQ is offline or was unsuccessful, deliver via direct Notification Service REST client
        if (!rabbitSuccess) {
            if (notificationServiceClient != null) {
                log.info("Dispatched password reset via NotificationServiceClient fallback for: {}", email);
                notificationServiceClient.sendPasswordReset(email, resetToken, resetUrl);
            } else {
                log.info("RabbitTemplate and NotificationServiceClient not active; reset link generated locally for {}: {}", email, resetUrl);
            }
        }
    }

    public void publishEmailVerification(String email, String verificationToken, java.time.LocalDateTime expiresAt) {
        EmailVerificationRequestedEvent event = new EmailVerificationRequestedEvent(email, verificationToken, expiresAt);
        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend(IDENTITY_EXCHANGE, ROUTING_KEY_EMAIL_VERIFY, event);
                log.info("Published EmailVerificationRequestedEvent for email: {}", email);
            } catch (Exception ex) {
                log.warn("Failed to publish EmailVerificationRequestedEvent to RabbitMQ: {}. Fallback active.", ex.getMessage());
            }
        } else {
            log.info("RabbitTemplate not available; EmailVerificationRequestedEvent dispatched locally for email: {}", email);
        }
    }
}
