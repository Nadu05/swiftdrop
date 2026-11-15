package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.dto.AssignmentHistoryResponse;
import com.swiftdrop.dispatch.dto.AssignmentReassignRequest;
import com.swiftdrop.dispatch.dto.AssignmentRequest;
import com.swiftdrop.dispatch.dto.AssignmentResponse;
import com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest;
import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.AssignmentHistory;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.event.CourierAssignedEventData;
import com.swiftdrop.dispatch.event.CourierReassignedEventData;
import com.swiftdrop.dispatch.event.DeliveryStatusChangedEventData;
import com.swiftdrop.dispatch.event.DispatchEvent;
import com.swiftdrop.dispatch.exception.AccessDeniedException;
import com.swiftdrop.dispatch.exception.CourierNotAvailableException;
import com.swiftdrop.dispatch.exception.DuplicateAssignmentException;
import com.swiftdrop.dispatch.exception.InvalidAssignmentStateException;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.AssignmentHistoryRepository;
import com.swiftdrop.dispatch.repository.AssignmentRepository;
import com.swiftdrop.dispatch.repository.CourierRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Service responsible for creating, retrieving, reassigning, and updating courier assignments,
 * with reliable transactional outbox event publishing to RabbitMQ.
 */
@Service
@Transactional
public class AssignmentService {

    public static final Set<AssignmentStatus> ACTIVE_ASSIGNMENT_STATUSES = Set.of(
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.IN_TRANSIT
    );

    public static final Set<AssignmentStatus> REASSIGNABLE_STATUSES = Set.of(
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.IN_TRANSIT
    );

    public static final Set<AssignmentStatus> TERMINAL_STATUSES = Set.of(
            AssignmentStatus.DELIVERED,
            AssignmentStatus.CANCELLED,
            AssignmentStatus.FAILED,
            AssignmentStatus.REASSIGNED
    );

    private static final Map<AssignmentStatus, Set<AssignmentStatus>> ALLOWED_TRANSITIONS = Map.of(
            AssignmentStatus.ASSIGNED, Set.of(AssignmentStatus.ACCEPTED, AssignmentStatus.CANCELLED, AssignmentStatus.REASSIGNED),
            AssignmentStatus.ACCEPTED, Set.of(AssignmentStatus.IN_TRANSIT, AssignmentStatus.CANCELLED, AssignmentStatus.REASSIGNED),
            AssignmentStatus.IN_TRANSIT, Set.of(AssignmentStatus.DELIVERED, AssignmentStatus.FAILED, AssignmentStatus.REASSIGNED),
            AssignmentStatus.DELIVERED, Set.of(),
            AssignmentStatus.CANCELLED, Set.of(),
            AssignmentStatus.FAILED, Set.of(),
            AssignmentStatus.REASSIGNED, Set.of()
    );

    private final CourierRepository courierRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentHistoryRepository assignmentHistoryRepository;
    private final OrderServiceClient orderServiceClient;
    private final OutboxPublisherService outboxPublisherService;

    public AssignmentService(CourierRepository courierRepository,
                             AssignmentRepository assignmentRepository,
                             AssignmentHistoryRepository assignmentHistoryRepository,
                             OrderServiceClient orderServiceClient,
                             OutboxPublisherService outboxPublisherService) {
        this.courierRepository = courierRepository;
        this.assignmentRepository = assignmentRepository;
        this.assignmentHistoryRepository = assignmentHistoryRepository;
        this.orderServiceClient = orderServiceClient;
        this.outboxPublisherService = outboxPublisherService;
    }

    /**
     * Retrieve all assignments, optionally filtered by courierId, branchId, status, and orderId.
     */
    @Transactional(readOnly = true)
    public List<AssignmentResponse> findAll(Long courierId, Long branchId, AssignmentStatus status, Long orderId) {
        List<Assignment> assignments = assignmentRepository.findWithFilters(courierId, branchId, status, orderId);
        return assignments.stream()
                .map(a -> toResponse(a, a.getCourier()))
                .toList();
    }

    /**
     * Retrieve an assignment by its primary key ID.
     */
    @Transactional(readOnly = true)
    public AssignmentResponse findById(Long id) {
        Assignment assignment = assignmentRepository.findByIdWithCourier(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", id));
        return toResponse(assignment, assignment.getCourier());
    }

    /**
     * Retrieve all assignments belonging to the authenticated courier identified by userId.
     */
    @Transactional(readOnly = true)
    public List<AssignmentResponse> findAssignmentsForCourierUser(Long userId) {
        Courier courier = courierRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Courier for user", userId));
        List<Assignment> assignments = assignmentRepository.findByCourierId(courier.getId());
        return assignments.stream()
                .map(a -> toResponse(a, courier))
                .toList();
    }

    /**
     * Retrieve the complete chronological audit history for an assignment.
     */
    @Transactional(readOnly = true)
    public List<AssignmentHistoryResponse> findHistoryByAssignmentId(Long assignmentId) {
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new ResourceNotFoundException("Assignment", assignmentId);
        }
        List<AssignmentHistory> historyList = assignmentHistoryRepository.findHistoryByAssignmentIdChronological(assignmentId);
        return historyList.stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    /**
     * Assign a courier to an order.
     * Enforces pessimistic locking, capacity validation, and publishes a reliable transactional outbox event.
     */
    public AssignmentResponse createAssignment(AssignmentRequest request) {
        if (request == null || request.getOrderId() == null || request.getCourierId() == null) {
            throw new IllegalArgumentException("Order ID and Courier ID are required");
        }

        Long orderId = request.getOrderId();
        Long courierId = request.getCourierId();

        // 1. Verify that the order is eligible for dispatch via Order Service
        orderServiceClient.verifyOrderEligibleForDispatch(orderId);

        // 2. Acquire pessimistic write lock (SELECT ... FOR UPDATE) on the Courier record
        Courier courier = courierRepository.findByIdForUpdate(courierId)
                .orElseThrow(() -> new ResourceNotFoundException("Courier", courierId));

        // 3. Verify courier status
        if (courier.getStatus() == CourierStatus.OFFLINE) {
            throw new CourierNotAvailableException("Courier is currently offline");
        }
        if (courier.getStatus() == CourierStatus.BUSY) {
            throw new CourierNotAvailableException("Courier is currently busy");
        }
        if (courier.getStatus() != CourierStatus.AVAILABLE) {
            throw new CourierNotAvailableException("Courier is not available");
        }

        // 4 & 5. Calculate active workload and verify max capacity while holding courier lock
        long activeDeliveries = assignmentRepository.countByCourierIdAndStatusIn(courierId, ACTIVE_ASSIGNMENT_STATUSES);
        int maxCapacity = courier.getMaxCapacity() != null ? courier.getMaxCapacity() : 5;
        if (activeDeliveries >= maxCapacity) {
            throw new CourierNotAvailableException("Courier has reached maximum delivery capacity");
        }

        // 6. Pre-check whether order already has an active assignment
        boolean hasActiveAssignment = assignmentRepository.existsByOrderIdAndStatusIn(orderId, ACTIVE_ASSIGNMENT_STATUSES);
        if (hasActiveAssignment) {
            throw new DuplicateAssignmentException("Order " + orderId + " already has an active courier assignment");
        }

        // 7. Create new Assignment
        Assignment assignment = new Assignment();
        assignment.setOrderId(orderId);
        assignment.setCourier(courier);
        assignment.setBranchId(courier.getBranchId());
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setAssignedBy(1L); // Default dispatcher ID; authentication integration pending
        assignment.setAssignmentCode(generateAssignmentCode());

        Assignment savedAssignment;
        try {
            savedAssignment = assignmentRepository.saveAndFlush(assignment);
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateAssignmentException("Database constraint violation: order already has an active assignment", ex);
        }

        // 8. Record initial assignment history
        AssignmentHistory history = new AssignmentHistory(
                savedAssignment,
                null,
                courier,
                savedAssignment.getAssignedBy(),
                "Initial dispatch allocation"
        );
        assignmentHistoryRepository.save(history);

        // 9. Publish dispatch.courier.assigned event via transactional outbox
        CourierAssignedEventData eventData = new CourierAssignedEventData(
                savedAssignment.getId(),
                savedAssignment.getOrderId(),
                courier.getId(),
                savedAssignment.getBranchId(),
                savedAssignment.getStatus().name()
        );
        DispatchEvent<CourierAssignedEventData> event = new DispatchEvent<>(
                UUID.randomUUID().toString(),
                "dispatch.courier.assigned",
                1,
                savedAssignment.getAssignedAt(),
                "dispatch-service",
                null,
                eventData
        );
        outboxPublisherService.saveAndPublish("dispatch.courier.assigned.v1", event);

        // 10. Return response DTO
        return toResponse(savedAssignment, courier);
    }

    /**
     * Reassign an active delivery assignment to a new courier.
     * Enforces concurrency protection, updates history, and publishes dispatch.courier.reassigned event.
     */
    public AssignmentResponse reassignCourier(Long assignmentId, AssignmentReassignRequest request) {
        if (request == null || request.getCourierId() == null) {
            throw new IllegalArgumentException("New courier ID is required");
        }

        Long newCourierId = request.getCourierId();

        // 1. Verify that the assignment exists
        Assignment assignment = assignmentRepository.findByIdWithCourier(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", assignmentId));

        // 2. Verify that the assignment is in a state that permits reassignment
        if (!REASSIGNABLE_STATUSES.contains(assignment.getStatus())) {
            throw new InvalidAssignmentStateException(
                    "Cannot reassign assignment with status '" + assignment.getStatus() +
                    "'. Reassignment is only allowed for active assignments (ASSIGNED, ACCEPTED, IN_TRANSIT)."
            );
        }

        // 3. Verify that the new courier is different from the current courier
        Courier previousCourier = assignment.getCourier();
        if (previousCourier != null && previousCourier.getId().equals(newCourierId)) {
            throw new IllegalArgumentException("Assignment is already assigned to courier " + newCourierId);
        }

        // 4. Acquire pessimistic write lock on the new Courier
        Courier newCourier = courierRepository.findByIdForUpdate(newCourierId)
                .orElseThrow(() -> new ResourceNotFoundException("Courier", newCourierId));

        // 5. Verify new courier availability status
        if (newCourier.getStatus() == CourierStatus.OFFLINE) {
            throw new CourierNotAvailableException("Courier is currently offline");
        }
        if (newCourier.getStatus() == CourierStatus.BUSY) {
            throw new CourierNotAvailableException("Courier is currently busy");
        }
        if (newCourier.getStatus() != CourierStatus.AVAILABLE) {
            throw new CourierNotAvailableException("Courier is not available");
        }

        // 6. Check new courier active workload and capacity
        long activeDeliveries = assignmentRepository.countByCourierIdAndStatusIn(newCourierId, ACTIVE_ASSIGNMENT_STATUSES);
        int maxCapacity = newCourier.getMaxCapacity() != null ? newCourier.getMaxCapacity() : 5;
        if (activeDeliveries >= maxCapacity) {
            throw new CourierNotAvailableException("Courier has reached maximum delivery capacity");
        }

        // 7. Update assignment's courier and timestamps
        assignment.setCourier(newCourier);
        assignment.setBranchId(newCourier.getBranchId());
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setUpdatedAt(LocalDateTime.now());
        Assignment updatedAssignment = assignmentRepository.saveAndFlush(assignment);

        // 8. Record immutable audit trail in assignment_history
        Long changedBy = request.getChangedBy() != null ? request.getChangedBy() : 1L;
        String reason = request.getReason() != null && !request.getReason().isBlank()
                ? request.getReason()
                : "Courier reassignment";

        AssignmentHistory history = new AssignmentHistory(
                updatedAssignment,
                previousCourier,
                newCourier,
                changedBy,
                reason
        );
        assignmentHistoryRepository.save(history);

        // 9. Publish dispatch.courier.reassigned event via transactional outbox
        CourierReassignedEventData eventData = new CourierReassignedEventData(
                updatedAssignment.getId(),
                updatedAssignment.getOrderId(),
                previousCourier != null ? previousCourier.getId() : null,
                newCourier.getId(),
                updatedAssignment.getBranchId(),
                updatedAssignment.getStatus().name(),
                reason,
                changedBy
        );
        DispatchEvent<CourierReassignedEventData> event = new DispatchEvent<>(
                UUID.randomUUID().toString(),
                "dispatch.courier.reassigned",
                1,
                updatedAssignment.getUpdatedAt(),
                "dispatch-service",
                null,
                eventData
        );
        outboxPublisherService.saveAndPublish("dispatch.courier.reassigned.v1", event);

        // 10. Return updated response
        return toResponse(updatedAssignment, newCourier);
    }

    /**
     * Update the operational lifecycle status of an assignment (e.g. ASSIGNED -> ACCEPTED -> IN_TRANSIT -> DELIVERED).
     * Enforces courier ownership when called by a courier, records audit history, and publishes
     * dispatch.delivery.status.changed event via transactional outbox.
     */
    public AssignmentResponse updateAssignmentStatus(Long assignmentId, AssignmentStatusUpdateRequest request,
                                                    Long actorUserId, boolean isCourierActor) {
        if (request == null || request.getStatus() == null) {
            throw new IllegalArgumentException("New status is required");
        }

        AssignmentStatus newStatus = request.getStatus();

        // 1. Verify assignment exists
        Assignment assignment = assignmentRepository.findByIdWithCourier(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", assignmentId));

        // 2. Ownership verification for courier actor
        if (isCourierActor) {
            if (actorUserId == null) {
                throw new AccessDeniedException("Courier identification required for status updates");
            }
            Courier courier = courierRepository.findByUserId(actorUserId)
                    .orElseThrow(() -> new AccessDeniedException("No courier profile linked to user " + actorUserId));

            if (!assignment.getCourier().getId().equals(courier.getId())) {
                throw new AccessDeniedException("Courier " + courier.getId() + " is not authorized to update assignment " + assignmentId);
            }
        }

        // 3. Validate lifecycle state transition
        AssignmentStatus currentStatus = assignment.getStatus();
        Set<AssignmentStatus> allowedNext = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowedNext.contains(newStatus)) {
            throw new InvalidAssignmentStateException(
                    "Invalid delivery status transition from '" + currentStatus + "' to '" + newStatus + "'"
            );
        }

        if (newStatus == AssignmentStatus.FAILED
                && (request.getNotes() == null || request.getNotes().isBlank())) {
            throw new IllegalArgumentException("Failure reason is required when marking a delivery as FAILED");
        }

        // 4. Update assignment status
        assignment.setStatus(newStatus);
        assignment.setUpdatedAt(LocalDateTime.now());
        Assignment updatedAssignment = assignmentRepository.saveAndFlush(assignment);

        // 5. Record status change in assignment history
        AssignmentHistory history = new AssignmentHistory(
                updatedAssignment,
                updatedAssignment.getCourier(),
                updatedAssignment.getCourier(),
                actorUserId != null ? actorUserId : 1L,
                request.getNotes() != null && !request.getNotes().isBlank()
                        ? request.getNotes()
                        : "Status updated to " + newStatus
        );
        assignmentHistoryRepository.save(history);

        // 6. Publish dispatch.delivery.status.changed event via transactional outbox
        DeliveryStatusChangedEventData eventData = new DeliveryStatusChangedEventData(
                updatedAssignment.getId(),
                updatedAssignment.getOrderId(),
                updatedAssignment.getCourier().getId(),
                currentStatus.name(),
                newStatus.name(),
                actorUserId != null ? actorUserId : 1L,
                request.getNotes()
        );
        DispatchEvent<DeliveryStatusChangedEventData> event = new DispatchEvent<>(
                UUID.randomUUID().toString(),
                "dispatch.delivery.status.changed",
                1,
                updatedAssignment.getUpdatedAt(),
                "dispatch-service",
                null,
                eventData
        );
        outboxPublisherService.saveAndPublish("dispatch.delivery.status.changed.v1", event);

        return toResponse(updatedAssignment, updatedAssignment.getCourier());
    }

    private String generateAssignmentCode() {
        return "ASN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private AssignmentResponse toResponse(Assignment assignment, Courier courier) {
        return new AssignmentResponse(
                assignment.getId(),
                assignment.getAssignmentCode(),
                assignment.getOrderId(),
                courier != null ? courier.getId() : null,
                courier != null ? courier.getCourierCode() : null,
                assignment.getBranchId(),
                assignment.getAssignedBy(),
                assignment.getStatus(),
                assignment.getAssignedAt()
        );
    }

    private AssignmentHistoryResponse toHistoryResponse(AssignmentHistory history) {
        Long prevCourierId = history.getPreviousCourier() != null ? history.getPreviousCourier().getId() : null;
        String prevCourierCode = history.getPreviousCourier() != null ? history.getPreviousCourier().getCourierCode() : null;
        String prevCourierName = history.getPreviousCourier() != null ? history.getPreviousCourier().getName() : null;

        Long newCourierId = history.getNewCourier() != null ? history.getNewCourier().getId() : null;
        String newCourierCode = history.getNewCourier() != null ? history.getNewCourier().getCourierCode() : null;
        String newCourierName = history.getNewCourier() != null ? history.getNewCourier().getName() : null;

        return new AssignmentHistoryResponse(
                history.getId(),
                history.getAssignment() != null ? history.getAssignment().getId() : null,
                prevCourierId,
                prevCourierCode,
                prevCourierName,
                newCourierId,
                newCourierCode,
                newCourierName,
                history.getChangedBy(),
                history.getChangeReason(),
                history.getChangedAt()
        );
    }
}
