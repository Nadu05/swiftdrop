package com.swiftdrop.organization.client;

/**
 * Client for sending Branch Manager credential emails via notification-service.
 */
public interface NotificationServiceClient {

    NotificationBranchCredentialsResultDto sendBranchCredentials(
            String recipientEmail,
            String branchName,
            String branchCode,
            String loginEmail,
            String temporaryPassword
    );
}
