package com.swiftdrop.order.client;

import com.swiftdrop.order.dto.RouteBranchResolutionDto;

/**
 * Integration boundary with Organization Service for dual-coordinate branch resolution.
 */
public interface OrganizationServiceClient {

    RouteBranchResolutionDto resolveRoute(
            double pickupLatitude,
            double pickupLongitude,
            double destinationLatitude,
            double destinationLongitude
    );
}

