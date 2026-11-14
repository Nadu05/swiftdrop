package com.swiftdrop.order.branch;

import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.location.City;

import java.util.Optional;

/**
 * Decides which branch handles a delivery, from its pickup town.
 *
 * <p>The decision belongs to the Organization service (service areas plus nearest branch, Haversine). This
 * service only asks and stores the answer on the order.
 */
public interface BranchResolver {

    /**
     * @return the branch for the pickup town, or empty when branch resolution is switched off
     *         ({@code swiftdrop.organization.branch-resolution-enabled=false})
     * @throws BusinessRuleException             (HTTP 422) when no active service area covers the pickup
     * @throws BranchServiceUnavailableException (HTTP 503) when the Organization service cannot answer; no
     *                                           order may be created without a branch
     */
    Optional<ResolvedBranch> resolve(City pickup);
}
