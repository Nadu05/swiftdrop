package com.swiftdrop.notification.service;

import com.swiftdrop.notification.entity.NotificationEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

class MailpitDeliveryIntegrationTest {

    static boolean isMailpitRunning() {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:8025/api/v1/messages"))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    @Test
    @EnabledIf("isMailpitRunning")
    void verifyLiveEmailDeliveryToMailpit() throws Exception {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("localhost");
        mailSender.setPort(1025);

        SmtpNotificationSender sender = new SmtpNotificationSender(mailSender, "noreply@swiftdrop.lk");

        // 1. Send Branch Admin Credentials Email
        NotificationEntity branchAdminNotif = new NotificationEntity();
        branchAdminNotif.setNotificationCode("NTF-BRANCH-001");
        branchAdminNotif.setNotificationType("BRANCH_MANAGER_CREDENTIALS");
        branchAdminNotif.setRecipientEmail("branchadmin.kdy@swiftdrop.lk");
        branchAdminNotif.setTitle("Welcome to SwiftDrop – Your Branch Admin Account (Kandy Central)");
        branchAdminNotif.setMessage("Your SwiftDrop Branch Admin account for Kandy Central (KDY-01) is ready.\n\n" +
                "Login Email: branchadmin.kdy@swiftdrop.lk\n" +
                "Temporary Password: TempAdmin#2026\n\n" +
                "Please sign in and change your password immediately.");
        sender.send(branchAdminNotif);

        // 2. Send Password Reset Email
        NotificationEntity resetNotif = new NotificationEntity();
        resetNotif.setNotificationCode("NTF-RESET-001");
        resetNotif.setNotificationType("PASSWORD_RESET");
        resetNotif.setRecipientEmail("user.reset@example.com");
        resetNotif.setTitle("SwiftDrop – Password Reset Request");
        resetNotif.setMessage("You requested to reset your password for SwiftDrop.\n\n" +
                "Please use the following link to set a new password:\n" +
                "http://localhost:3000/reset-password?token=sample-reset-token-999\n\n" +
                "This link will expire in 1 hour.");
        sender.send(resetNotif);

        // 3. Verify in Mailpit
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8025/api/v1/messages"))
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        String body = response.body();
        assertThat(body).contains("branchadmin.kdy@swiftdrop.lk");
        assertThat(body).contains("user.reset@example.com");
        assertThat(body).contains("Welcome to SwiftDrop – Your Branch Admin Account (Kandy Central)");
        assertThat(body).contains("SwiftDrop – Password Reset Request");
    }
}
