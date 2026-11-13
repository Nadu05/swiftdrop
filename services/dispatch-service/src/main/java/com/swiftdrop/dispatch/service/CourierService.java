package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.CourierAvailabilityResponse;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.AssignmentRepository;
import com.swiftdrop.dispatch.repository.CourierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service layer responsible for courier retrieval, active delivery workload calculation,
 * and assignment eligibility determination.
 */
@Service
@Transactional
public class CourierService {

    public static final Set<AssignmentStatus> ACTIVE_ASSIGNMENT_STATUSES = Set.of(
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.IN_TRANSIT
    );

    public static final String REASON_BUSY = "Courier is currently busy";
    public static final String REASON_OFFLINE = "Courier is currently offline";
    public static final String REASON_MAX_CAPACITY = "Courier has reached maximum delivery capacity";

    private final CourierRepository courierRepository;
    private final AssignmentRepository assignmentRepository;

    public CourierService(CourierRepository courierRepository, AssignmentRepository assignmentRepository) {
        this.courierRepository = courierRepository;
        this.assignmentRepository = assignmentRepository;
    }

    /**
     * Retrieve courier availability and workload filtered optionally by operational status and branch.
     *
     * @param status optional operational status filter
     * @param branchId optional branch identifier filter
     * @return list of courier availability responses
     */
    @Transactional(readOnly = true)
    public List<CourierAvailabilityResponse> getCourierAvailability(CourierStatus status, Long branchId) {
        List<Courier> couriers;

        if (status != null && branchId != null) {
            couriers = courierRepository.findByStatusAndBranchId(status, branchId);
        } else if (status != null) {
            couriers = courierRepository.findByStatus(status);
        } else if (branchId != null) {
            couriers = courierRepository.findByBranchId(branchId);
        } else {
            couriers = courierRepository.findAll();
        }

        return couriers.stream()
                .map(this::toAvailabilityResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieve availability and workload for all couriers across all branches.
     */
    @Transactional(readOnly = true)
    public List<CourierAvailabilityResponse> getAllCouriers() {
        return getCourierAvailability(null, null);
    }

    /**
     * Retrieve couriers filtered by operational status.
     */
    @Transactional(readOnly = true)
    public List<CourierAvailabilityResponse> getCouriersByStatus(CourierStatus status) {
        return getCourierAvailability(status, null);
    }

    /**
     * Retrieve couriers filtered by branch identifier.
     */
    @Transactional(readOnly = true)
    public List<CourierAvailabilityResponse> getCouriersByBranchId(Long branchId) {
        return getCourierAvailability(null, branchId);
    }

    /**
     * Retrieve couriers filtered by operational status and branch identifier.
     */
    @Transactional(readOnly = true)
    public List<CourierAvailabilityResponse> getCouriersByStatusAndBranchId(CourierStatus status, Long branchId) {
        return getCourierAvailability(status, branchId);
    }

    /**
     * Retrieve availability and workload for a specific courier by ID.
     *
     * @param courierId the courier database primary key
     * @return courier availability response
     * @throws ResourceNotFoundException if courier is not found
     */
    @Transactional(readOnly = true)
    public CourierAvailabilityResponse getCourierAvailabilityById(Long courierId) {
        Courier courier = courierRepository.findById(courierId)
                .orElseThrow(() -> new ResourceNotFoundException("Courier", courierId));
        return toAvailabilityResponse(courier);
    }

    /**
     * Calculate current active delivery workload for a courier.
     * Only assignments in ASSIGNED, ACCEPTED, or IN_TRANSIT status are counted.
     *
     * @param courierId the courier database identifier
     * @return number of active deliveries
     */
    @Transactional(readOnly = true)
    public int calculateActiveWorkload(Long courierId) {
        long count = assignmentRepository.countByCourierIdAndStatusIn(courierId, ACTIVE_ASSIGNMENT_STATUSES);
        return (int) count;
    }

    /**
     * Maps a Courier entity to a CourierAvailabilityResponse by calculating its current workload
     * and determining eligibility according to business rules.
     *
     * @param courier the courier entity
     * @return populated availability response
     */
    public CourierAvailabilityResponse toAvailabilityResponse(Courier courier) {
        int activeDeliveries = calculateActiveWorkload(courier.getId());
        return toAvailabilityResponse(courier, activeDeliveries);
    }

    /**
     * Determines courier eligibility given the courier profile and active delivery count.
     *
     * Rules:
     * 1. Operational status must be AVAILABLE.
     * 2. Active delivery count must be strictly less than maximum capacity (activeDeliveries < maxCapacity).
     *
     * @param courier the courier entity
     * @param activeDeliveries the current active workload
     * @return populated availability response
     */
    public CourierAvailabilityResponse toAvailabilityResponse(Courier courier, int activeDeliveries) {
        boolean isEligible = false;
        String ineligibilityReason = null;
        int maxCapacity = courier.getMaxCapacity() != null ? courier.getMaxCapacity() : 5;

        if (courier.getStatus() == CourierStatus.BUSY) {
            ineligibilityReason = REASON_BUSY;
        } else if (courier.getStatus() == CourierStatus.OFFLINE) {
            ineligibilityReason = REASON_OFFLINE;
        } else if (courier.getStatus() == CourierStatus.AVAILABLE) {
            if (activeDeliveries >= maxCapacity) {
                ineligibilityReason = REASON_MAX_CAPACITY;
            } else {
                isEligible = true;
            }
        } else {
            ineligibilityReason = "Courier status is not available";
        }

        return new CourierAvailabilityResponse(
                courier.getId(),
                courier.getCourierCode(),
                courier.getName(),
                courier.getStatus(),
                activeDeliveries,
                maxCapacity,
                isEligible,
                ineligibilityReason
        );
    }
}

