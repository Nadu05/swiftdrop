package com.swiftdrop.organization.client;

import java.util.Optional;

/**
 * Client for provisioning and managing Branch Manager credentials in
 * identity-service.
 */
public interface IdentityServiceClient {

    IdentityBranchManagerCredentialsDto provisionBranchManager(
            Long branchId,
            String email,
            String fullName,
            String organizationId);

    Optional<IdentityBranchManagerCredentialsDto> getBranchManagerCredentials(Long branchId);

    IdentityBranchManagerCredentialsDto resetBranchManagerCredentials(Long branchId);

    /**
     * Grants the MERCHANT role and links the approved merchant organizationId to
     * the user in identity-service.
     */
    default void grantMerchantAccess(String userId, String organizationId) {
        // Default no-op for unit test stubs
    }

    /**
     * Automatically provisions OAuth 2.0 Client Credentials in identity-service
     * when a merchant is approved.
     */
    default Optional<com.swiftdrop.organization.dto.MerchantProvisionedOAuthDto> provisionMerchantOAuthClient(
            String merchantId,
            String merchantName,
            java.util.List<String> scopes) {
        return Optional.empty();
    }

    /**
     * Revokes all active OAuth 2.0 clients for a suspended or terminated merchant.
     */
    default void revokeMerchantOAuthClients(String merchantId, String reason) {
        // Default no-op for unit test stubs
    }
}
