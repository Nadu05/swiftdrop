package com.swiftdrop.order.branch;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.location.City;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;
import java.util.Optional;

/**
 * Asks the Organization service {@code POST /api/v1/branches/resolve} for the nearest branch whose service
 * area covers the pickup town's centre.
 *
 * <p>Town-centre coordinates are used because an order carries a town, not a street coordinate. Only the town
 * code is logged.
 */
public class OrganizationBranchResolver implements BranchResolver {

    static final String RESOLVE_PATH = "/api/v1/branches/resolve";
    static final String NOT_SERVED_MESSAGE = "We do not collect parcels from this pickup area yet";
    static final String UNAVAILABLE_MESSAGE =
            "We could not assign a branch to your delivery right now. Please try again shortly.";

    private static final int UNPROCESSABLE_ENTITY = 422;
    private static final Logger log = LoggerFactory.getLogger(OrganizationBranchResolver.class);

    private final RestClient client;

    public OrganizationBranchResolver(RestClient client) {
        this.client = client;
    }

    @Override
    public Optional<ResolvedBranch> resolve(City pickup) {
        Answer answer;
        try {
            answer = client.post()
                    .uri(RESOLVE_PATH)
                    .body(Map.of("latitude", pickup.latitude(), "longitude", pickup.longitude()))
                    .retrieve()
                    .body(Answer.class);
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode().value() == UNPROCESSABLE_ENTITY) {
                // The Organization service's way of saying "no active service area covers this point"
                throw new BusinessRuleException(NOT_SERVED_MESSAGE);
            }
            log.error("Branch resolution rejected by the Organization service: status={}, pickupCity={}",
                    ex.getStatusCode().value(), pickup.code());
            throw new BranchServiceUnavailableException(UNAVAILABLE_MESSAGE, ex);
        } catch (RestClientException ex) {
            log.error("Branch resolution failed: pickupCity={}, reason={}", pickup.code(), ex.getClass().getSimpleName());
            throw new BranchServiceUnavailableException(UNAVAILABLE_MESSAGE, ex);
        }

        if (answer == null || answer.branchId() == null) {
            log.error("Branch resolution returned no branch: pickupCity={}", pickup.code());
            throw new BranchServiceUnavailableException(UNAVAILABLE_MESSAGE);
        }
        if (!answer.eligible()) {
            throw new BusinessRuleException(NOT_SERVED_MESSAGE);
        }
        double distance = answer.distanceKm() == null ? 0.0 : answer.distanceKm();
        return Optional.of(new ResolvedBranch(answer.branchId(), answer.branchCode(), answer.branchName(), distance));
    }

    /** The fields of the Organization service's {@code BranchResolutionResponse} that are used; others are ignored. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record Answer(Long branchId, String branchCode, String branchName, Double distanceKm, boolean eligible) {
    }
}
