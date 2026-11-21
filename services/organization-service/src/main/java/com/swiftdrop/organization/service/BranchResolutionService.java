package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
import com.swiftdrop.organization.dto.RouteBranchResolutionRequest;
import com.swiftdrop.organization.dto.RouteBranchResolutionResponse;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.BranchPostalArea;
import com.swiftdrop.organization.entity.PostalArea;
import com.swiftdrop.organization.exception.UnsupportedServiceAreaException;
import com.swiftdrop.organization.repository.BranchPostalAreaRepository;
import com.swiftdrop.organization.util.HaversineDistanceCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Service responsible for deterministic postal-code-first Branch Coverage resolution.
 *
 * <p>Resolves active branches strictly from {@code postal_areas} and active
 * {@code branch_postal_areas} assignments belonging to {@code ACTIVE} branches.
 * Never falls back to legacy Haversine {@code service_areas}.</p>
 */
@Service
@Transactional(readOnly = true)
public class BranchResolutionService {

    private final BranchPostalAreaRepository branchPostalAreaRepository;

    public BranchResolutionService(BranchPostalAreaRepository branchPostalAreaRepository) {
        this.branchPostalAreaRepository = branchPostalAreaRepository;
    }

    /**
     * Resolves the active branch covering the given pickup postal code.
     *
     * @param request postal code payload
     * @return covering active branch details
     * @throws UnsupportedServiceAreaException if the postal code is unknown, inactive, or unassigned
     */
    public BranchResolutionResponse resolveNearestBranch(BranchResolutionRequest request) {
        return resolveByPostalCode(request.getPostalCode(), "PICKUP").response();
    }

    /**
     * Resolves both the active origin branch (for {@code pickupPostalCode}) and
     * destination branch (for {@code dropoffPostalCode}) in a single operation.
     *
     * @param request pickup and dropoff postal codes
     * @return structured origin and destination branch information with {@code interBranchDistanceKm}
     * @throws UnsupportedServiceAreaException if either postal code is unknown, inactive, or unassigned
     */
    public RouteBranchResolutionResponse resolveRoute(RouteBranchResolutionRequest request) {
        ResolvedBranchResult origin = resolveByPostalCode(request.getPickupPostalCode(), "PICKUP");
        ResolvedBranchResult destination = resolveByPostalCode(request.getDropoffPostalCode(), "DESTINATION");

        boolean sameBranch = Objects.equals(origin.branch().getId(), destination.branch().getId());
        double interBranchDistanceKm = 0.0;
        if (!sameBranch
                && origin.branch().getLatitude() != null
                && origin.branch().getLongitude() != null
                && destination.branch().getLatitude() != null
                && destination.branch().getLongitude() != null) {
            double rawInterBranch = HaversineDistanceCalculator.calculateDistance(
                    origin.branch().getLatitude(),
                    origin.branch().getLongitude(),
                    destination.branch().getLatitude(),
                    destination.branch().getLongitude()
            );
            interBranchDistanceKm = roundToTwoDecimals(rawInterBranch);
        }

        return new RouteBranchResolutionResponse(
                origin.response(),
                destination.response(),
                sameBranch,
                interBranchDistanceKm
        );
    }

    private ResolvedBranchResult resolveByPostalCode(String rawPostalCode, String locationType) {
        String postalCode = rawPostalCode != null ? rawPostalCode.trim() : "";
        BranchPostalArea assignment = branchPostalAreaRepository
                .findActiveByPostalCodeAndActiveBranch(postalCode)
                .orElseThrow(() -> new UnsupportedServiceAreaException(locationType, postalCode));

        Branch branch = assignment.getBranch();
        PostalArea postalArea = assignment.getPostalArea();

        double distanceKm = 0.0;
        if (postalArea != null
                && postalArea.getLatitude() != null
                && postalArea.getLongitude() != null
                && branch.getLatitude() != null
                && branch.getLongitude() != null) {
            distanceKm = roundToTwoDecimals(HaversineDistanceCalculator.calculateDistance(
                    postalArea.getLatitude(),
                    postalArea.getLongitude(),
                    branch.getLatitude(),
                    branch.getLongitude()
            ));
        }

        BranchResolutionResponse response = new BranchResolutionResponse(
                branch.getId(),
                branch.getCode(),
                branch.getName(),
                distanceKm,
                true
        );

        return new ResolvedBranchResult(branch, response);
    }

    private double roundToTwoDecimals(double value) {
        return BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private record ResolvedBranchResult(Branch branch, BranchResolutionResponse response) {}
}
