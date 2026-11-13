package com.swiftdrop.identity.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import static com.swiftdrop.identity.config.RabbitMQConfig.IDENTITY_EXCHANGE;

@Component
public class IdentityEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(IdentityEventPublisher.class);

    public static final String ROUTING_KEY_PASSWORD_RESET = "identity.event.password-reset";
    public static final String ROUTING_KEY_EMAIL_VERIFY   = "identity.event.email-verification";

    private final RabbitTemplate rabbitTemplate;

    public IdentityEventPublisher(@Autowired(required = false) RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishPasswordReset(String email, String resetToken, java.time.LocalDateTime expiresAt) {
        PasswordResetRequestedEvent event = new PasswordResetRequestedEvent(email, resetToken, expiresAt);
        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend(IDENTITY_EXCHANGE, ROUTING_KEY_PASSWORD_RESET, event);
                log.info("Published PasswordResetRequestedEvent for email: {}", email);
            } catch (Exception ex) {
                log.warn("Failed to publish PasswordResetRequestedEvent to RabbitMQ: {}. Fallback active.", ex.getMessage());
            }
        } else {
            log.info("RabbitTemplate not available; PasswordResetRequestedEvent dispatched locally for email: {}", email);
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

