package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
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
 * for a customer's parcel pickup location.
 *
 * <p>Two distinct geographic calculations are performed:
 * <ol>
 *   <li><strong>Service-area eligibility:</strong> Distance between pickup location and service-area center
 *       must be &le; {@code maxRadiusKm}.</li>
 *   <li><strong>Nearest branch selection:</strong> Among branches with at least one covering service area,
 *       the branch closest to the pickup location (using the branch's own coordinates) is selected.</li>
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
        double pickupLat = request.getLatitude();
        double pickupLng = request.getLongitude();

        // 1. Fetch all active service areas belonging to active branches
        List<ServiceArea> activeServiceAreas = serviceAreaRepository
                .findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE);

        // 2. Identify unique eligible branches whose service area covers the pickup coordinates
        Map<Long, Branch> eligibleBranches = new HashMap<>();

        for (ServiceArea area : activeServiceAreas) {
            double distanceToCenter = HaversineDistanceCalculator.calculateDistance(
                    pickupLat, pickupLng,
                    area.getCenterLatitude(), area.getCenterLongitude()
            );

            if (distanceToCenter <= area.getMaxRadiusKm().doubleValue()) {
                Branch branch = area.getBranch();
                eligibleBranches.putIfAbsent(branch.getId(), branch);
            }
        }

        // 3. If no branch covers the pickup location, reject with HTTP 422
        if (eligibleBranches.isEmpty()) {
            throw new UnsupportedServiceAreaException(pickupLat, pickupLng);
        }

        // 4. Select the nearest branch using the branch's own geographic coordinates
        Branch bestBranch = null;
        double minDistance = Double.MAX_VALUE;

        // Sort by branch ID first for stable iteration, then compare distances
        List<Branch> candidates = new ArrayList<>(eligibleBranches.values());
        candidates.sort(Comparator.comparing(Branch::getId));

        for (Branch branch : candidates) {
            double branchDistance = HaversineDistanceCalculator.calculateDistance(
                    pickupLat, pickupLng,
                    branch.getLatitude(), branch.getLongitude()
            );

            if (branchDistance < minDistance) {
                minDistance = branchDistance;
                bestBranch = branch;
            } else if (Double.compare(branchDistance, minDistance) == 0 && bestBranch != null) {
                // Deterministic tie-breaker: smaller branch ID wins
                if (branch.getId() < bestBranch.getId()) {
                    bestBranch = branch;
                }
            }
        }

        // Round distance to 2 decimal places
        double roundedDistance = BigDecimal.valueOf(minDistance)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();

        return new BranchResolutionResponse(
                bestBranch.getId(),
                bestBranch.getCode(),
                bestBranch.getName(),
                roundedDistance,
                true
        );
    }
}

