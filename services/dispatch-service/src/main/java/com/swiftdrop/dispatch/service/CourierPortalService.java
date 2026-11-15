package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.courier.CourierJobResponse;
import com.swiftdrop.dispatch.dto.courier.CourierProfileResponse;
import com.swiftdrop.dispatch.dto.courier.FailedDeliveryRequest;
import com.swiftdrop.dispatch.dto.courier.ProofOfDeliveryRequest;
import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.CourierDelivery;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import com.swiftdrop.dispatch.exception.CourierPortalException;
import com.swiftdrop.dispatch.repository.CourierAssignmentRepository;
import com.swiftdrop.dispatch.repository.CourierDeliveryRepository;
import com.swiftdrop.dispatch.repository.CourierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Courier portal read model and courier-only details.
 *
 * <p><strong>Not here:</strong> job status changes (accept, pick up, deliver, fail). Those belong to
 * {@code AssignmentService.updateAssignmentStatus} ({@code PATCH /assignments/{id}/status}), which
 * validates transitions, writes history and publishes outbox events. The courier UI calls that endpoint.
 *
 * <p>This service adds what that flow does not cover: the courier's profile and online/offline toggle,
 * a job list with recipient/pickup/parcel details, and proof-of-delivery / failure details recorded just
 * before the courier sends DELIVERED or FAILED.
 */
@Service
@Transactional
public class CourierPortalService {

    private static final Logger log = LoggerFactory.getLogger(CourierPortalService.class);

    /** Statuses shown to the courier. REASSIGNED/CANCELLED jobs are no longer theirs to work. */
    static final Set<AssignmentStatus> VISIBLE_STATUSES = EnumSet.of(
            AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_TRANSIT,
            AssignmentStatus.DELIVERED, AssignmentStatus.FAILED);

    static final int DEFAULT_LIMIT = 100;
    static final int MAX_LIMIT = 200;

    private static final Pattern OTP_PATTERN = Pattern.compile("^\\d{4,6}$");

    private final CourierRepository courierRepository;
    private final CourierAssignmentRepository assignmentRepository;
    private final CourierDeliveryRepository deliveryRepository;
    private final CourierService courierService;
    private final Clock clock;

    @Autowired
    public CourierPortalService(CourierRepository courierRepository,
                                CourierAssignmentRepository assignmentRepository,
                                CourierDeliveryRepository deliveryRepository,
                                CourierService courierService) {
        this(courierRepository, assignmentRepository, deliveryRepository, courierService, Clock.systemUTC());
    }

    CourierPortalService(CourierRepository courierRepository,
                         CourierAssignmentRepository assignmentRepository,
                         CourierDeliveryRepository deliveryRepository,
                         CourierService courierService,
                         Clock clock) {
        this.courierRepository = courierRepository;
        this.assignmentRepository = assignmentRepository;
        this.deliveryRepository = deliveryRepository;
        this.courierService = courierService;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ profile

    @Transactional(readOnly = true)
    public CourierProfileResponse getProfile(Long courierId) {
        return toProfile(findCourier(courierId));
    }

    /**
     * Online sets AVAILABLE, offline sets OFFLINE. Active jobs are kept when going offline; the courier
     * simply stops being eligible for new assignments. BUSY is left to the dispatcher assignment domain.
     */
    public CourierProfileResponse setAvailability(Long courierId, boolean online) {
        Courier courier = findCourier(courierId);
        CourierStatus target = online ? CourierStatus.AVAILABLE : CourierStatus.OFFLINE;
        if (online && courier.getStatus() != CourierStatus.OFFLINE) {
            return toProfile(courier); // already online (AVAILABLE or BUSY): nothing to change
        }
        if (courier.getStatus() != target) {
            courier.setStatus(target);
            courier = courierRepository.save(courier);
            log.info("Courier {} set availability to {}", courierId, target);
        }
        return toProfile(courier);
    }

    // ------------------------------------------------------------------ jobs

    @Transactional(readOnly = true)
    public List<CourierJobResponse> listJobs(Long courierId, Integer limit) {
        findCourier(courierId);
        int size = limit == null ? DEFAULT_LIMIT : Math.max(1, Math.min(limit, MAX_LIMIT));
        List<Assignment> assignments = assignmentRepository.findCourierJobs(
                courierId, VISIBLE_STATUSES, PageRequest.of(0, size));
        if (assignments.isEmpty()) {
            return List.of();
        }
        Map<Long, CourierDelivery> details = deliveryRepository
                .findByAssignmentIdIn(assignments.stream().map(Assignment::getId).toList())
                .stream()
                .collect(Collectors.toMap(d -> d.getAssignment().getId(), Function.identity()));
        return assignments.stream().map(a -> toJob(a, details.get(a.getId()))).toList();
    }

    /**
     * Stores proof of delivery for a job in transit. The courier then sends DELIVERED through
     * {@code PATCH /assignments/{id}/status}. Re-sending before that overwrites the proof.
     */
    public CourierJobResponse recordProofOfDelivery(Long courierId, Long assignmentId, ProofOfDeliveryRequest request) {
        Assignment assignment = ownJob(courierId, assignmentId);
        requireInTransit(assignment, "Pick up the parcel before adding proof of delivery.");
        if (request.type() == ProofOfDeliveryType.OTP && !OTP_PATTERN.matcher(request.reference().trim()).matches()) {
            throw CourierPortalException.badRequest("OTP must be 4 to 6 digits.");
        }
        CourierDelivery delivery = detailsFor(assignment);
        delivery.setPodType(request.type());
        delivery.setPodReference(request.reference().trim());
        delivery.setPodReceivedBy(request.receivedBy().trim());
        delivery.setCompletedAt(Instant.now(clock));
        deliveryRepository.save(delivery);
        log.info("Courier {} recorded proof of delivery for assignment {}", courierId, assignmentId); // details not logged
        return toJob(assignment, delivery);
    }

    /**
     * Stores why a job in transit could not be delivered. The courier then sends FAILED (with the reason
     * as notes) through {@code PATCH /assignments/{id}/status}.
     */
    public CourierJobResponse recordFailureDetails(Long courierId, Long assignmentId, FailedDeliveryRequest request) {
        Assignment assignment = ownJob(courierId, assignmentId);
        requireInTransit(assignment, "Only parcels you have picked up can be marked as failed.");
        CourierDelivery delivery = detailsFor(assignment);
        delivery.setFailureReason(request.reason().trim());
        delivery.setFailureNotes(request.notes().trim());
        delivery.setCompletedAt(Instant.now(clock));
        deliveryRepository.save(delivery);
        log.info("Courier {} recorded failure details for assignment {}", courierId, assignmentId);
        return toJob(assignment, delivery);
    }

    // ------------------------------------------------------------------ helpers

    private Courier findCourier(Long courierId) {
        return courierRepository.findById(courierId)
                .orElseThrow(() -> CourierPortalException.notFound("Courier profile not found."));
    }

    private Assignment ownJob(Long courierId, Long assignmentId) {
        return assignmentRepository.findOwnJob(assignmentId, courierId)
                .orElseThrow(() -> CourierPortalException.notFound("This job is not assigned to you."));
    }

    private static void requireInTransit(Assignment assignment, String message) {
        if (assignment.getStatus() != AssignmentStatus.IN_TRANSIT) {
            throw CourierPortalException.conflict(message);
        }
    }

    private CourierDelivery detailsFor(Assignment assignment) {
        return deliveryRepository.findByAssignmentId(assignment.getId())
                .orElseGet(() -> new CourierDelivery(assignment));
    }

    private CourierProfileResponse toProfile(Courier courier) {
        return new CourierProfileResponse(
                courier.getId(),
                courier.getCourierCode(),
                courier.getName(),
                courier.getPhone(),
                courier.getStatus(),
                courier.getVehicleType(),
                courier.getVehiclePlate(),
                courier.getBranchId(),
                courier.getMaxCapacity() != null ? courier.getMaxCapacity() : 5,
                courierService.calculateActiveWorkload(courier.getId()));
    }

    static CourierJobResponse toJob(Assignment a, CourierDelivery d) {
        if (d == null) {
            return new CourierJobResponse(a.getId(), a.getAssignmentCode(), a.getOrderId(), null, a.getStatus(),
                    null, null, null, null, null, a.getAssignedAt(), null, null, null, null);
        }
        CourierJobResponse.ProofOfDelivery pod = d.getPodType() == null ? null
                : new CourierJobResponse.ProofOfDelivery(d.getPodType(), d.getPodReceivedBy(), d.getPodReference());
        CourierJobResponse.Failure failure = d.getFailureReason() == null ? null
                : new CourierJobResponse.Failure(d.getFailureReason(), d.getFailureNotes());
        return new CourierJobResponse(
                a.getId(),
                a.getAssignmentCode(),
                a.getOrderId(),
                d.getTrackingNumber(),
                a.getStatus(),
                d.getPriority(),
                new CourierJobResponse.Stop(d.getPickupName(), d.getPickupPhone(), d.getPickupAddress(), d.getPickupCity()),
                new CourierJobResponse.Recipient(d.getRecipientName(), d.getRecipientPhone(), d.getDeliveryAddress(), d.getDeliveryCity()),
                new CourierJobResponse.Parcel(d.getPackageType(), d.getWeightKg(), d.getHandlingNotes()),
                d.getPayoutAmount(),
                a.getAssignedAt(),
                d.getPickedUpAt(),
                d.getCompletedAt(),
                pod,
                failure);
    }
}
