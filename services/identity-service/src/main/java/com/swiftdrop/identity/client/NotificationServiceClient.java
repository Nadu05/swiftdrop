package com.swiftdrop.identity.client;

public interface NotificationServiceClient {
    void sendPasswordReset(String recipientEmail, String resetToken, String resetUrl);
}
