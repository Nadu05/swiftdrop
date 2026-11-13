package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
import com.swiftdrop.organization.dto.RouteBranchResolutionRequest;
import com.swiftdrop.organization.dto.RouteBranchResolutionResponse;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import com.swiftdrop.organization.exception.UnsupportedServiceAreaException;
import com.swiftdrop.organization.repository.ServiceAreaRepository;
import com.swiftdrop.organization.util.HaversineDistanceCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Service responsible for automatically determining the nearest eligible branch
 * for parcel pickup and destination locations.
 *
 * <p>Two distinct geographic calculations are performed:
 * <ol>
 *   <li><strong>Service-area eligibility:</strong> Distance between target location and service-area center
 *       must be &le; {@code maxRadiusKm} and both the service area and owning branch must be {@code ACTIVE}.</li>
 *   <li><strong>Nearest branch selection:</strong> Among active branches with at least one covering service area,
 *       the branch closest to the target location (using the branch's own coordinates) is selected.</li>
 * </ol>
 * </p>
 */
@Service
@Transactional(readOnly = true)
public class BranchResolutionService {

    private final ServiceAreaRepository serviceAreaRepository;

    public BranchResolutionService(ServiceAreaRepository serviceAreaRepository) {
        this.serviceAreaRepository = serviceAreaRepository;
    }

    /**
     * Resolves the nearest eligible active branch for given pickup coordinates.
     *
     * @param request coordinate payload (latitude, longitude)
     * @return selected branch details with calculated distance in km
     * @throws UnsupportedServiceAreaException if no active service area covers the location
     */
    public BranchResolutionResponse resolveNearestBranch(BranchResolutionRequest request) {
        List<ServiceArea> activeServiceAreas = serviceAreaRepository
                .findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE);

        ResolvedBranchResult resolved = resolveCoordinate(
                request.getLatitude(),
                request.getLongitude(),
                "PICKUP",
                activeServiceAreas
        );
        return resolved.response();
    }

    /**
     * Resolves both the nearest eligible origin branch (for pickup coordinates) and
     * destination branch (for delivery coordinates) in a single operation.
     *
     * @param request pickup and destination coordinates
     * @return structured origin and destination branch information
     * @throws UnsupportedServiceAreaException if either pickup or destination is outside active service areas
     */
    public RouteBranchResolutionResponse resolveRoute(RouteBranchResolutionRequest request) {
        List<ServiceArea> activeServiceAreas = serviceAreaRepository
                .findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE);

        ResolvedBranchResult origin = resolveCoordinate(
                request.getPickupLatitude(),
                request.getPickupLongitude(),
                "PICKUP",
                activeServiceAreas
        );

        ResolvedBranchResult destination = resolveCoordinate(
                request.getDestinationLatitude(),
                request.getDestinationLongitude(),
                "DESTINATION",
                activeServiceAreas
        );

        boolean sameBranch = Objects.equals(origin.branch().getId(), destination.branch().getId());
        double interBranchDistanceKm = 0.0;
        if (!sameBranch) {
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

    private ResolvedBranchResult resolveCoordinate(
            double targetLat,
            double targetLng,
            String locationType,
            List<ServiceArea> activeServiceAreas) {

        Map<Long, Branch> eligibleBranches = new HashMap<>();

        for (ServiceArea area : activeServiceAreas) {
            if (area.getStatus() != ServiceAreaStatus.ACTIVE) {
                continue;
            }
            Branch branch = area.getBranch();
            if (branch == null || branch.getStatus() != BranchStatus.ACTIVE) {
                continue;
            }

            double distanceToCenter = HaversineDistanceCalculator.calculateDistance(
                    targetLat, targetLng,
                    area.getCenterLatitude(), area.getCenterLongitude()
            );

            if (distanceToCenter <= area.getMaxRadiusKm().doubleValue()) {
                eligibleBranches.putIfAbsent(branch.getId(), branch);
            }
        }

        if (eligibleBranches.isEmpty()) {
            throw new UnsupportedServiceAreaException(locationType, targetLat, targetLng);
        }

        Branch bestBranch = null;
        double minDistance = Double.MAX_VALUE;

        List<Branch> candidates = new ArrayList<>(eligibleBranches.values());
        candidates.sort(Comparator.comparing(Branch::getId));

        for (Branch branch : candidates) {
            double branchDistance = HaversineDistanceCalculator.calculateDistance(
                    targetLat, targetLng,
                    branch.getLatitude(), branch.getLongitude()
            );

            if (branchDistance < minDistance) {
                minDistance = branchDistance;
                bestBranch = branch;
            } else if (Double.compare(branchDistance, minDistance) == 0 && bestBranch != null) {
                if (branch.getId() < bestBranch.getId()) {
                    bestBranch = branch;
                }
            }
        }

        double roundedDistance = roundToTwoDecimals(minDistance);
        BranchResolutionResponse response = new BranchResolutionResponse(
                bestBranch.getId(),
                bestBranch.getCode(),
                bestBranch.getName(),
                roundedDistance,
                true
        );

        return new ResolvedBranchResult(bestBranch, response);
    }

    private double roundToTwoDecimals(double value) {
        return BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private record ResolvedBranchResult(Branch branch, BranchResolutionResponse response) {}
}
