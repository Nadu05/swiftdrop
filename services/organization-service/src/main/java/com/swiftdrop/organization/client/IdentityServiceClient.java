package com.swiftdrop.organization.client;

import java.util.Optional;

/**
 * Client for provisioning and managing Branch Manager credentials in identity-service.
 */
public interface IdentityServiceClient {

    IdentityBranchManagerCredentialsDto provisionBranchManager(
            Long branchId,
            String email,
            String fullName,
            String organizationId
    );

    Optional<IdentityBranchManagerCredentialsDto> getBranchManagerCredentials(Long branchId);

    IdentityBranchManagerCredentialsDto resetBranchManagerCredentials(Long branchId);
}
