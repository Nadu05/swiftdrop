package com.swiftdrop.notification.service;

import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.exception.NotificationDeliveryException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmtpNotificationSenderTest {

    @Test
    void send_BranchManagerCredentials_SendsHtmlMimeMessage() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        SmtpNotificationSender sender = new SmtpNotificationSender(mailSender, "noreply@swiftdrop.lk");

        NotificationEntity entity = new NotificationEntity();
        entity.setNotificationCode("NTF-888888");
        entity.setNotificationType("BRANCH_MANAGER_CREDENTIALS");
        entity.setRecipientEmail("manager.kdy@swiftdrop.lk");
        entity.setTitle("SwiftDrop Branch Manager Credentials - Kandy (KDY)");
        entity.setMessage("Your SwiftDrop Branch Manager account for Kandy (KDY) is ready.\n\n" +
                "Login Email: manager.kdy@swiftdrop.lk\n" +
                "Temporary Password: TempSecret#999\n\n" +
                "Please sign in and change your password immediately.");

        sender.send(entity);

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void send_PasswordReset_SendsHtmlMimeMessage() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        SmtpNotificationSender sender = new SmtpNotificationSender(mailSender, "noreply@swiftdrop.lk");

        NotificationEntity entity = new NotificationEntity();
        entity.setNotificationCode("NTF-777777");
        entity.setNotificationType("PASSWORD_RESET");
        entity.setRecipientEmail("user@example.com");
        entity.setTitle("SwiftDrop — Reset Your Password");
        entity.setMessage("You requested to reset your password for SwiftDrop.\n\n" +
                "Please use the following link to set a new password:\n" +
                "http://localhost:3000/reset-password?token=secret-token-123\n\n" +
                "This link will expire in 1 hour.");

        sender.send(entity);

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void send_WithValidRecipientEmail_SendsSimpleMailMessage() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        SmtpNotificationSender sender = new SmtpNotificationSender(mailSender, "noreply@swiftdrop.lk");

        NotificationEntity entity = new NotificationEntity();
        entity.setNotificationCode("NTF-123456");
        entity.setRecipientEmail("kandy@swiftdrop.lk");
        entity.setTitle("SwiftDrop Branch Manager Credentials - Kandy Hub (KDY)");
        entity.setMessage("Login Email: kandy@swiftdrop.lk\nTemporary Password: TempPass#123");

        sender.send(entity);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());

        SimpleMailMessage sent = captor.getValue();
        assertThat(sent.getFrom()).isEqualTo("noreply@swiftdrop.lk");
        assertThat(sent.getTo()).containsExactly("kandy@swiftdrop.lk");
        assertThat(sent.getSubject()).isEqualTo("SwiftDrop Branch Manager Credentials - Kandy Hub (KDY)");
        assertThat(sent.getText()).contains("kandy@swiftdrop.lk", "TempPass#123");
    }

    @Test
    void send_WhenJavaMailSenderThrows_ThrowsNotificationDeliveryException() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        doThrow(new MailSendException("SMTP connection refused"))
                .when(mailSender).send(any(SimpleMailMessage.class));
        SmtpNotificationSender sender = new SmtpNotificationSender(mailSender, "noreply@swiftdrop.lk");

        NotificationEntity entity = new NotificationEntity();
        entity.setRecipientEmail("kandy@swiftdrop.lk");
        entity.setTitle("Credentials");
        entity.setMessage("Body");

        assertThatThrownBy(() -> sender.send(entity))
                .isInstanceOf(NotificationDeliveryException.class)
                .hasMessageContaining("SMTP connection refused");
    }

    @Test
    void send_WhenRecipientEmailMissing_ThrowsNotificationDeliveryException() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        SmtpNotificationSender sender = new SmtpNotificationSender(mailSender, "noreply@swiftdrop.lk");

        NotificationEntity entity = new NotificationEntity();
        entity.setRecipientEmail("   ");
        entity.setTitle("Credentials");
        entity.setMessage("Body");

        assertThatThrownBy(() -> sender.send(entity))
                .isInstanceOf(NotificationDeliveryException.class)
                .hasMessageContaining("Recipient email is required");
    }

    @Test
    void contextConfiguration_UsesLoggingFallbackWhenDisabledAndSmtpWhenEnabled() {
        ApplicationContextRunner baseRunner = new ApplicationContextRunner()
                .withUserConfiguration(LoggingNotificationSender.class, SmtpNotificationSender.class);

        baseRunner.run(ctx -> {
            assertThat(ctx).hasSingleBean(LoggingNotificationSender.class);
            assertThat(ctx).doesNotHaveBean(SmtpNotificationSender.class);
        });

        baseRunner
                .withPropertyValues("app.mail.enabled=true", "app.mail.from=noreply@swiftdrop.lk")
                .withBean(JavaMailSender.class, () -> mock(JavaMailSender.class))
                .run(ctx -> {
                    assertThat(ctx).hasSingleBean(SmtpNotificationSender.class);
                    assertThat(ctx).doesNotHaveBean(LoggingNotificationSender.class);
                });
    }
}
