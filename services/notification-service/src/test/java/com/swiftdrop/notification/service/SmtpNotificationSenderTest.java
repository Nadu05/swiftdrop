package com.swiftdrop.notification.service;

import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.exception.NotificationDeliveryException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class SmtpNotificationSenderTest {

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
