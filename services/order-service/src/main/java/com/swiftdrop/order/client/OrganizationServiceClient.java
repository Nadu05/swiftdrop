package com.swiftdrop.order.client;

import com.swiftdrop.order.dto.RouteBranchResolutionDto;

/**
 * Integration boundary with Organization Service for postal-code-first branch resolution.
 */
public interface OrganizationServiceClient {

    RouteBranchResolutionDto resolveRoute(
            String pickupPostalCode,
            String dropoffPostalCode
    );
}
