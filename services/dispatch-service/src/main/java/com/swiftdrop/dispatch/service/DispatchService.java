package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.client.OrderStatusTransitionPayload;
import com.swiftdrop.dispatch.client.OrderSummaryDto;
import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.*;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.exception.IdempotencyConflictException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Supplier;

@Service
@Transactional
public class DispatchService {

    private static final Logger log = LoggerFactory.getLogger(DispatchService.class);
    public static final int DEFAULT_MAX_DELIVERY_ATTEMPTS = 3;

    private static final Set<AssignmentStatus> ACTIVE_WORKLOAD_STATUSES = EnumSet.of(
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.IN_TRANSIT,
            AssignmentStatus.REASSIGNED
    );

    private final CourierProfileRepository courierRepository;
    private final PickupTaskRepository pickupTaskRepository;
    private final DeliveryJobRepository deliveryJobRepository;
    private final CourierAssignmentRepository assignmentRepository;
    private final DeliveryAttemptRepository attemptRepository;
    private final ProofOfDeliveryRepository podRepository;
    private final DeliveryExceptionRepository exceptionRepository;
    private final OrderServiceClient orderServiceClient;
    private final PodEvidenceStorageService podEvidenceStorageService;
    private final DispatchEventPublisher eventPublisher;
    private final SecureRandom random = new SecureRandom();

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private ReturnTaskService returnTaskService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private OperationalExceptionService operationalExceptionService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CustodyTrackingService custodyTrackingService;

    public DispatchService(
            CourierProfileRepository courierRepository,
            PickupTaskRepository pickupTaskRepository,
            DeliveryJobRepository deliveryJobRepository,
            CourierAssignmentRepository assignmentRepository,
            DeliveryAttemptRepository attemptRepository,
            ProofOfDeliveryRepository podRepository,
            DeliveryExceptionRepository exceptionRepository,
            OrderServiceClient orderServiceClient,
            PodEvidenceStorageService podEvidenceStorageService,
            DispatchEventPublisher eventPublisher) {
        this.courierRepository = courierRepository;
        this.pickupTaskRepository = pickupTaskRepository;
        this.deliveryJobRepository = deliveryJobRepository;
        this.assignmentRepository = assignmentRepository;
        this.attemptRepository = attemptRepository;
        this.podRepository = podRepository;
        this.exceptionRepository = exceptionRepository;
        this.orderServiceClient = orderServiceClient;
        this.podEvidenceStorageService = podEvidenceStorageService;
        this.eventPublisher = eventPublisher;
    }

    // =========================================================================
    // 1. ORDER INTEGRATION & TASK CREATION (PICKUP & LAST-MILE)
    // =========================================================================

    public PickupTaskDto createPickupTask(
            CreateOperationalTaskRequest request,
            DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN roles can create operational pickup tasks");

        OrderSummaryDto orderInfo = resolveOrderSummary(request);
        PickupMethod method = PickupMethod.fromValue(
                request.getPickupMethod() != null ? request.getPickupMethod() : orderInfo.getPickupMethod()
        );

        // Requirement 3: Do not create an unnecessary courier pickup task for branch drop-off
        if (method == PickupMethod.BRANCH_DROPOFF) {
            throw new DispatchValidationException(
                    "BRANCH_DROPOFF_NO_PICKUP_TASK",
                    "Branch drop-off orders do not require a courier pickup task; confirm receipt at the branch instead"
            );
        }

        Long originBranchId = orderInfo.getOriginBranchId() != null ? orderInfo.getOriginBranchId() : 1L;
        enforceBranchAccess(principal, originBranchId, "create pickup task for branch " + originBranchId);

        Optional<PickupTask> existing = pickupTaskRepository.findByOrderId(orderInfo.resolvedOrderId());
        if (existing.isPresent()) {
            return toPickupTaskDto(existing.get());
        }

        PickupTask task = buildPickupTaskFromOrder(orderInfo, method, request.getPriority());
        PickupTask saved = pickupTaskRepository.save(task);
        eventPublisher.publishEvent(
                "dispatch.pickup.created",
                "PickupTaskCreated",
                Map.of(
                        "taskCode", saved.getTaskCode(),
                        "orderId", saved.getOrderId(),
                        "trackingNumber", saved.getTrackingNumber(),
                        "pickupMethod", saved.getPickupMethod().name(),
                        "originBranchId", saved.getOriginBranchId(),
                        "originBranchName", saved.getOriginBranchName() != null ? saved.getOriginBranchName() : ""
                )
        );
        return toPickupTaskDto(saved);
    }

    /**
     * Requirement 3 (Branch Drop-off):
     * Allows authorized branch personnel to confirm parcel receipt at the origin branch.
     * Records branch, employee, timestamp, and parcel reference without creating a courier pickup task.
     */
    public PickupTaskDto confirmBranchDropoff(
            BranchDropoffConfirmRequest request,
            DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only authorized branch personnel (DISPATCHER or ADMIN) can confirm branch drop-off receipt");

        if ((request.getOrderId() == null || request.getOrderId().isBlank())
                && (request.getTrackingNumber() == null || request.getTrackingNumber().isBlank())) {
            throw new IllegalArgumentException("Either orderId or trackingNumber is required to confirm branch drop-off");
        }

        String lookupKey = (request.getOrderId() != null && !request.getOrderId().isBlank())
                ? request.getOrderId().trim()
                : request.getTrackingNumber().trim();

        OrderSummaryDto orderInfo = resolveOrderSummaryForDropoff(lookupKey, request);
        Long originBranchId = request.getBranchId() != null
                ? request.getBranchId()
                : (orderInfo.getOriginBranchId() != null ? orderInfo.getOriginBranchId() : 1L);

        enforceBranchAccess(principal, originBranchId, "confirm branch drop-off receipt at branch " + originBranchId);

        PickupTask task = pickupTaskRepository.findByOrderId(orderInfo.resolvedOrderId())
                .or(() -> pickupTaskRepository.findByTrackingNumberIgnoreCase(orderInfo.getTrackingNumber()))
                .orElseGet(() -> buildPickupTaskFromOrder(orderInfo, PickupMethod.BRANCH_DROPOFF, "NORMAL"));

        task.setPickupMethod(PickupMethod.BRANCH_DROPOFF);
        task.setStatus(PickupTaskStatus.BRANCH_RECEIVED);
        task.setOriginBranchId(originBranchId);
        if (request.getBranchCode() != null && !request.getBranchCode().isBlank()) {
            task.setOriginBranchCode(request.getBranchCode().trim());
        }
        if (request.getBranchName() != null && !request.getBranchName().isBlank()) {
            task.setOriginBranchName(request.getBranchName().trim());
        }

        String employeeId = (request.getEmployeeId() != null && !request.getEmployeeId().isBlank())
                ? request.getEmployeeId().trim()
                : (principal != null ? principal.userId() : "branch-staff");
        String employeeName = (request.getEmployeeName() != null && !request.getEmployeeName().isBlank())
                ? request.getEmployeeName().trim()
                : (principal != null && principal.email() != null ? principal.email() : "Branch Operations Officer");
        String parcelRef = (request.getParcelReference() != null && !request.getParcelReference().isBlank())
                ? request.getParcelReference().trim()
                : "PRC-" + task.getTrackingNumber();

        LocalDateTime now = LocalDateTime.now();
        task.setBranchConfirmedByEmployeeId(employeeId);
        task.setBranchConfirmedByEmployeeName(employeeName);
        task.setBranchConfirmedAt(now);
        task.setParcelReference(parcelRef);
        task.setCompletedAt(now);

        PickupTask saved = pickupTaskRepository.save(task);

        // Notify Order Service of branch drop-off (transitions order to AT_ORIGIN_BRANCH)
        String actorRole = principal != null && !principal.roles().isEmpty() ? principal.roles().get(0) : "DISPATCHER";
        orderServiceClient.notifyBranchDropoff(
                task.getOrderId(),
                request.getNotes() != null ? request.getNotes() : "Branch drop-off confirmed by " + employeeName + " (ref: " + parcelRef + ")",
                employeeId,
                actorRole
        );

        // If origin branch equals destination branch, automatically create the last-mile DeliveryJob
        if (saved.isSameBranch() && !deliveryJobRepository.existsByOrderId(saved.getOrderId())) {
            DeliveryJob sameBranchJob = buildDeliveryJobFromPickupTask(saved);
            deliveryJobRepository.save(sameBranchJob);
        }

        eventPublisher.publishEvent(
                "dispatch.parcel.received_at_branch",
                "ParcelReceivedAtBranch",
                Map.of(
                        "taskCode", saved.getTaskCode(),
                        "orderId", saved.getOrderId(),
                        "trackingNumber", saved.getTrackingNumber(),
                        "branchId", saved.getOriginBranchId(),
                        "branchName", saved.getOriginBranchName() != null ? saved.getOriginBranchName() : "",
                        "pickupMethod", "BRANCH_DROPOFF",
                        "employeeId", employeeId,
                        "parcelReference", parcelRef
                )
        );

        return toPickupTaskDto(saved);
    }

    public DeliveryJobDto createDeliveryJob(
            CreateOperationalTaskRequest request,
            DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN roles can create last-mile delivery jobs");

        OrderSummaryDto orderInfo = resolveOrderSummary(request);
        Long targetBranchId = orderInfo.getDestinationBranchId() != null
                ? orderInfo.getDestinationBranchId()
                : (orderInfo.getOriginBranchId() != null ? orderInfo.getOriginBranchId() : 1L);

        enforceBranchAccess(principal, targetBranchId, "create delivery job for branch " + targetBranchId);

        Optional<DeliveryJob> existing = deliveryJobRepository.findByOrderId(orderInfo.resolvedOrderId());
        if (existing.isPresent()) {
            return toDeliveryJobDto(existing.get(), null);
        }

        DeliveryJob job = buildDeliveryJobFromOrder(orderInfo, request.getPriority(), request.getDimensions());
        DeliveryJob saved = deliveryJobRepository.save(job);
        return toDeliveryJobDto(saved, null);
    }

    public void handleOrderCreatedEvent(CreateOperationalTaskRequest req) {
        OrderSummaryDto orderInfo = resolveOrderSummary(req);
        PickupMethod method = PickupMethod.fromValue(orderInfo.getPickupMethod());
        if (!pickupTaskRepository.existsByOrderId(orderInfo.resolvedOrderId())) {
            PickupTask task = buildPickupTaskFromOrder(orderInfo, method, req.getPriority());
            PickupTask saved = pickupTaskRepository.save(task);
            eventPublisher.publishEvent(
                    "dispatch.pickup.created",
                    "PickupTaskCreated",
                    Map.of(
                            "taskCode", saved.getTaskCode(),
                            "orderId", saved.getOrderId(),
                            "trackingNumber", saved.getTrackingNumber(),
                            "pickupMethod", saved.getPickupMethod().name(),
                            "originBranchId", saved.getOriginBranchId(),
                            "originBranchName", saved.getOriginBranchName() != null ? saved.getOriginBranchName() : ""
                    )
            );
        }
    }

    public void handleParcelAtDestinationBranchEvent(CreateOperationalTaskRequest req) {
        OrderSummaryDto orderInfo = resolveOrderSummary(req);
        if (!deliveryJobRepository.existsByOrderId(orderInfo.resolvedOrderId())) {
            DeliveryJob job = buildDeliveryJobFromOrder(orderInfo, req.getPriority(), req.getDimensions());
            deliveryJobRepository.save(job);
        }
    }

    private void reconcileBranchOrdersFromOrderService(Long effectiveBranchId) {
        try {
            List<OrderSummaryDto> orders = orderServiceClient.getOrdersForBranch(effectiveBranchId);
            if (orders == null || orders.isEmpty()) {
                return;
            }
            for (OrderSummaryDto orderInfo : orders) {
                String resolvedId = orderInfo.resolvedOrderId();
                if (resolvedId == null || resolvedId.isBlank()) {
                    continue;
                }
                String status = orderInfo.getStatus() != null ? orderInfo.getStatus().trim().toUpperCase() : "";
                boolean isOriginMatch = effectiveBranchId == null
                        || Objects.equals(orderInfo.getOriginBranchId(), effectiveBranchId);
                boolean isDestMatch = effectiveBranchId == null
                        || Objects.equals(orderInfo.getDestinationBranchId(), effectiveBranchId);
                boolean isSameBranch = Boolean.TRUE.equals(orderInfo.getSameBranch())
                        || (orderInfo.getOriginBranchId() != null
                        && Objects.equals(orderInfo.getOriginBranchId(), orderInfo.getDestinationBranchId()));

                if (isOriginMatch && Set.of("CONFIRMED", "PICKUP_ASSIGNED", "PICKED_UP", "AT_ORIGIN_BRANCH").contains(status)) {
                    Optional<PickupTask> existingTaskOpt = pickupTaskRepository.findByOrderId(resolvedId);
                    PickupMethod method = PickupMethod.fromValue(orderInfo.getPickupMethod());
                    if (existingTaskOpt.isEmpty() && !pickupTaskRepository.existsByOrderId(resolvedId)) {
                        PickupTask task = buildPickupTaskFromOrder(orderInfo, method, "NORMAL");
                        if ("PICKED_UP".equals(status)) {
                            task.setStatus(PickupTaskStatus.PICKED_UP);
                        } else if ("AT_ORIGIN_BRANCH".equals(status)) {
                            task.setStatus(method == PickupMethod.BRANCH_DROPOFF
                                    ? PickupTaskStatus.BRANCH_RECEIVED
                                    : PickupTaskStatus.PICKED_UP);
                        }
                        pickupTaskRepository.save(task);
                    } else if (existingTaskOpt.isPresent()) {
                        PickupTask existingTask = existingTaskOpt.get();
                        if ("AT_ORIGIN_BRANCH".equals(status)
                                && existingTask.getStatus() != PickupTaskStatus.PICKED_UP
                                && existingTask.getStatus() != PickupTaskStatus.BRANCH_RECEIVED) {
                            existingTask.setStatus(method == PickupMethod.BRANCH_DROPOFF
                                    ? PickupTaskStatus.BRANCH_RECEIVED
                                    : PickupTaskStatus.PICKED_UP);
                            pickupTaskRepository.save(existingTask);
                        } else if ("PICKED_UP".equals(status)
                                && existingTask.getStatus() != PickupTaskStatus.PICKED_UP
                                && existingTask.getStatus() != PickupTaskStatus.BRANCH_RECEIVED) {
                            existingTask.setStatus(PickupTaskStatus.PICKED_UP);
                            pickupTaskRepository.save(existingTask);
                        }
                    }
                }

                if (isDestMatch && ("AT_DESTINATION_BRANCH".equals(status)
                        || (isSameBranch && ("AT_ORIGIN_BRANCH".equals(status) || "PICKED_UP".equals(status))))) {
                    if (!deliveryJobRepository.existsByOrderId(resolvedId)) {
                        DeliveryJob job = buildDeliveryJobFromOrder(orderInfo, "NORMAL", null);
                        deliveryJobRepository.save(job);
                    }
                }
            }
        } catch (Exception ex) {
            // Best-effort sync; do not fail local queue read if Order Service is unreachable
            org.slf4j.LoggerFactory.getLogger(DispatchService.class)
                    .debug("Best-effort branch order reconciliation skipped for branch {}: {}", effectiveBranchId, ex.getMessage());
        }
    }

    @Transactional
    public List<PickupTaskDto> listPickupTasks(Long branchIdFilter, String statusFilter, DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN can list branch pickup tasks");
        Long effectiveBranchId = resolveScopedBranchId(principal, branchIdFilter);
        reconcileBranchOrdersFromOrderService(effectiveBranchId);

        List<PickupTask> tasks;
        if (effectiveBranchId != null) {
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                tasks = pickupTaskRepository.findByOriginBranchIdAndStatusOrderByCreatedAtDesc(
                        effectiveBranchId,
                        PickupTaskStatus.valueOf(statusFilter.trim().toUpperCase())
                );
            } else {
                tasks = pickupTaskRepository.findByOriginBranchIdOrderByCreatedAtDesc(effectiveBranchId);
            }
        } else {
            tasks = pickupTaskRepository.findAllByOrderByCreatedAtDesc();
        }
        return tasks.stream().map(this::toPickupTaskDto).toList();
    }

    @Transactional
    public List<DeliveryJobDto> listDeliveryJobs(Long branchIdFilter, String statusFilter, DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN can list branch delivery jobs");
        Long effectiveBranchId = resolveScopedBranchId(principal, branchIdFilter);
        reconcileBranchOrdersFromOrderService(effectiveBranchId);

        List<DeliveryJob> jobs;
        if (effectiveBranchId != null) {
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                jobs = deliveryJobRepository.findByBranchIdAndStatusOrderByCreatedAtDesc(
                        effectiveBranchId,
                        DeliveryJobStatus.valueOf(statusFilter.trim().toUpperCase())
                );
            } else {
                jobs = deliveryJobRepository.findByBranchIdOrderByCreatedAtDesc(effectiveBranchId);
            }
        } else {
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                jobs = deliveryJobRepository.findByStatusOrderByCreatedAtDesc(
                        DeliveryJobStatus.valueOf(statusFilter.trim().toUpperCase())
                );
            } else {
                jobs = deliveryJobRepository.findAllByOrderByCreatedAtDesc();
            }
        }
        return jobs.stream().map(j -> toDeliveryJobDto(j, null)).toList();
    }

    // =========================================================================
    // 2. COURIER FLEET, WORKLOAD & ELIGIBILITY
    // =========================================================================

    @Transactional(readOnly = true)
    public List<CourierProfileDto> listCouriers(Long branchIdFilter, DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN roles can list fleet couriers");
        Long effectiveBranchId = resolveScopedBranchId(principal, branchIdFilter);

        List<CourierProfileEntity> couriers = effectiveBranchId != null
                ? courierRepository.findByBranchIdOrderByNameAsc(effectiveBranchId)
                : courierRepository.findAllByOrderByNameAsc();

        return couriers.stream()
                .map(c -> toCourierProfileDto(c, null, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CourierProfileDto> getAvailableCouriers(
            Long branchId,
            String orderId,
            BigDecimal weightKg,
            DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN roles can query courier availability");

        Long targetBranchId = branchId;
        BigDecimal effectiveWeight = weightKg;

        if (orderId != null && !orderId.isBlank()) {
            Optional<DeliveryJob> jobOpt = deliveryJobRepository.findByOrderId(orderId.trim())
                    .or(() -> deliveryJobRepository.findByTrackingNumberIgnoreCase(orderId.trim()));
            if (jobOpt.isPresent()) {
                if (targetBranchId == null) {
                    targetBranchId = jobOpt.get().getBranchId();
                }
                if (effectiveWeight == null) {
                    effectiveWeight = jobOpt.get().getWeightKg();
                }
            } else {
                Optional<PickupTask> pickupOpt = pickupTaskRepository.findByOrderId(orderId.trim())
                        .or(() -> pickupTaskRepository.findByTrackingNumberIgnoreCase(orderId.trim()));
                if (pickupOpt.isPresent()) {
                    if (targetBranchId == null) {
                        targetBranchId = pickupOpt.get().getOriginBranchId();
                    }
                    if (effectiveWeight == null) {
                        effectiveWeight = pickupOpt.get().getWeightKg();
                    }
                }
            }
        }

        Long scopedBranchId = resolveScopedBranchId(principal, targetBranchId);
        List<CourierProfileEntity> couriers = scopedBranchId != null
                ? courierRepository.findByBranchIdOrderByNameAsc(scopedBranchId)
                : courierRepository.findAllByOrderByNameAsc();

        final Long eligibilityBranchId = scopedBranchId;
        final BigDecimal parcelWeight = effectiveWeight;

        return couriers.stream()
                .map(c -> toCourierProfileDto(c, eligibilityBranchId, parcelWeight))
                .toList();
    }

    @Transactional(readOnly = true)
    public CourierProfileDto getCourierWorkload(String courierIdOrCode, DispatchUserPrincipal principal) {
        CourierProfileEntity courier = resolveCourier(courierIdOrCode);
        if (principal != null && principal.isCourier()) {
            verifyCourierIdentityMatches(courier, principal);
        } else {
            requireDispatcherOrAdmin(principal, "Only DISPATCHER, ADMIN, or the courier themselves may view courier workload");
            enforceBranchAccess(principal, courier.getBranchId(), "view workload for courier in branch " + courier.getBranchId());
        }
        return toCourierProfileDto(courier, courier.getBranchId(), null);
    }

    public CourierProfileDto getMyCourierProfile(DispatchUserPrincipal principal) {
        requireCourierRole(principal);
        CourierProfileEntity courier = resolveOrProvisionCurrentCourier(principal);
        return toCourierProfileDto(courier, courier.getBranchId(), null);
    }

    public CourierProfileDto updateMyAvailability(
            CourierAvailabilityUpdateRequest request,
            DispatchUserPrincipal principal) {
        requireCourierRole(principal);
        CourierProfileEntity courier = resolveOrProvisionCurrentCourier(principal);

        long activeCount = countActiveWorkload(courier.getId());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            CourierAvailabilityStatus requestedStatus = CourierAvailabilityStatus.fromValue(request.getStatus());
            if (requestedStatus == CourierAvailabilityStatus.AVAILABLE && activeCount > 0) {
                courier.setAvailabilityStatus(CourierAvailabilityStatus.BUSY);
            } else {
                courier.setAvailabilityStatus(requestedStatus);
            }
        } else if (request.getOnline() != null) {
            if (Boolean.TRUE.equals(request.getOnline())) {
                courier.setAvailabilityStatus(activeCount > 0
                        ? CourierAvailabilityStatus.BUSY
                        : CourierAvailabilityStatus.AVAILABLE);
            } else {
                courier.setAvailabilityStatus(CourierAvailabilityStatus.OFFLINE);
            }
        }
        courier.setLastActiveAt(LocalDateTime.now());
        CourierProfileEntity saved = courierRepository.save(courier);
        return toCourierProfileDto(saved, saved.getBranchId(), null);
    }

    // =========================================================================
    // 3. COURIER ASSIGNMENT, REASSIGNMENT & HISTORY
    // =========================================================================

    public AssignmentRecordDto assignCourier(
            AssignCourierRequest request,
            DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN roles can assign couriers");

        CourierProfileEntity courier = resolveCourier(request.getCourierId());
        AssignmentTaskType taskType = resolveRequestedTaskType(request);

        if (taskType == AssignmentTaskType.PICKUP) {
            return assignCourierToPickupTask(request, courier, principal);
        }
        return assignCourierToDeliveryJob(request, courier, principal);
    }

    private AssignmentRecordDto assignCourierToPickupTask(
            AssignCourierRequest request,
            CourierProfileEntity courier,
            DispatchUserPrincipal principal) {

        PickupTask pickupTask = resolveOrCreatePickupTaskForAssignment(request);

        if (pickupTask.getPickupMethod() == PickupMethod.BRANCH_DROPOFF) {
            throw new DispatchValidationException(
                    "BRANCH_DROPOFF_NO_PICKUP_TASK",
                    "Cannot assign a pickup courier to a branch drop-off order"
            );
        }
        if (pickupTask.getStatus().isTerminal() || pickupTask.getStatus() == PickupTaskStatus.PICKED_UP) {
            throw new DispatchValidationException(
                    "INVALID_TASK_STATE",
                    "Pickup task " + pickupTask.getTaskCode() + " is already " + pickupTask.getStatus() + " and cannot be assigned"
            );
        }

        enforceBranchAccess(principal, pickupTask.getOriginBranchId(),
                "assign pickup task in branch " + pickupTask.getOriginBranchId());
        validateCourierEligibilityForTask(courier, pickupTask.getOriginBranchId(), pickupTask.getWeightKg(), principal);

        LocalDateTime now = LocalDateTime.now();
        CourierAssignment assignment = new CourierAssignment();
        assignment.setAssignmentCode(generateUniqueCode("ASN-", assignmentRepository::existsByAssignmentCodeIgnoreCase));
        assignment.setTaskType(AssignmentTaskType.PICKUP);
        assignment.setPickupTask(pickupTask);
        assignment.setOrderId(pickupTask.getOrderId());
        assignment.setTrackingNumber(pickupTask.getTrackingNumber());
        assignment.setBranchId(pickupTask.getOriginBranchId());
        assignment.setBranchCode(pickupTask.getOriginBranchCode());
        assignment.setBranchName(pickupTask.getOriginBranchName());
        assignment.setCourier(courier);
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setPriority(request.getPriority() != null
                ? DeliveryPriority.fromValue(request.getPriority())
                : pickupTask.getPriority());
        assignment.setNotes(request.getNotes() != null ? request.getNotes() : pickupTask.getHandlingNotes());
        assignment.setAssignedByUserId(principal.userId());
        assignment.setAssignedByName(principal.email() != null ? principal.email() : "Branch Dispatcher");
        assignment.setAssignedAt(now);

        AssignmentHistoryRecord historyEntry = new AssignmentHistoryRecord();
        historyEntry.setToCourierId(courier.getId());
        historyEntry.setToCourierName(courier.getName());
        historyEntry.setReason(request.getReason() != null && !request.getReason().isBlank()
                ? request.getReason().trim()
                : "Initial pickup courier allocation");
        historyEntry.setAssignedBy(assignment.getAssignedByName());
        historyEntry.setRecordedAt(now);
        assignment.addHistoryEntry(historyEntry);

        pickupTask.setStatus(PickupTaskStatus.ASSIGNED);
        pickupTask.setAssignedCourierId(courier.getId());
        pickupTask.setAssignedCourierCode(courier.getCourierCode());
        pickupTask.setAssignedCourierName(courier.getName());
        pickupTaskRepository.save(pickupTask);

        CourierAssignment savedAssignment = assignmentRepository.save(assignment);
        refreshCourierAvailabilityStatus(courier);

        // Notify Order Service of PICKUP_ASSIGNED
        OrderStatusTransitionPayload statusPayload = new OrderStatusTransitionPayload(
                "PICKUP_ASSIGNED",
                pickupTask.getOriginBranchName(),
                "Courier " + courier.getName() + " (" + courier.getCourierCode() + ") assigned for parcel pickup"
        );
        statusPayload.setCourierId(courier.getCourierCode());
        statusPayload.setCourierName(courier.getName());
        statusPayload.setCourierPhone(courier.getPhone());
        statusPayload.setCourierVehicle(courier.getVehicleType().getDisplayName());
        orderServiceClient.notifyStatusTransition(
                pickupTask.getOrderId(),
                statusPayload,
                principal.userId(),
                principal.isAdmin() ? "ADMIN" : "DISPATCHER"
        );

        eventPublisher.publishEvent(
                "dispatch.courier.assigned",
                "CourierAssigned",
                Map.of(
                        "assignmentType", "PICKUP",
                        "assignmentCode", savedAssignment.getAssignmentCode(),
                        "taskCode", pickupTask.getTaskCode(),
                        "orderId", pickupTask.getOrderId(),
                        "trackingNumber", pickupTask.getTrackingNumber(),
                        "courierCode", courier.getCourierCode(),
                        "courierName", courier.getName()
                )
        );

        return toAssignmentRecordDto(savedAssignment);
    }

    private AssignmentRecordDto assignCourierToDeliveryJob(
            AssignCourierRequest request,
            CourierProfileEntity courier,
            DispatchUserPrincipal principal) {

        DeliveryJob job = resolveOrCreateDeliveryJobForAssignment(request);

        if (job.getStatus() == DeliveryJobStatus.DELIVERED
                || job.getStatus() == DeliveryJobStatus.CANCELLED
                || job.getStatus() == DeliveryJobStatus.RETURN_TO_SENDER
                || job.getStatus() == DeliveryJobStatus.RETURNED_TO_SENDER) {
            throw new DispatchValidationException(
                    "INVALID_JOB_STATE",
                    "Delivery job " + job.getJobCode() + " is in state " + job.getStatus() + " and cannot be assigned"
            );
        }
        if (job.getStatus() == DeliveryJobStatus.PENDING_DISPATCHER_DECISION
                || job.getAttemptCount() >= job.getMaxAttempts()) {
            throw new DispatchValidationException(
                    "PENDING_EXCEPTION_DECISION",
                    "Delivery job " + job.getJobCode() + " has reached the maximum of "
                            + job.getMaxAttempts() + " failed attempts and requires a dispatcher exception decision before reassignment"
            );
        }

        enforceBranchAccess(principal, job.getBranchId(), "assign delivery job in branch " + job.getBranchId());
        validateCourierEligibilityForTask(courier, job.getBranchId(), job.getWeightKg(), principal);

        LocalDateTime now = LocalDateTime.now();
        CourierAssignment assignment = new CourierAssignment();
        assignment.setAssignmentCode(generateUniqueCode("ASN-", assignmentRepository::existsByAssignmentCodeIgnoreCase));
        assignment.setTaskType(AssignmentTaskType.DELIVERY);
        assignment.setDeliveryJob(job);
        assignment.setOrderId(job.getOrderId());
        assignment.setTrackingNumber(job.getTrackingNumber());
        assignment.setBranchId(job.getBranchId());
        assignment.setBranchCode(job.getBranchCode());
        assignment.setBranchName(job.getBranchName());
        assignment.setCourier(courier);
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setPriority(request.getPriority() != null
                ? DeliveryPriority.fromValue(request.getPriority())
                : job.getPriority());
        assignment.setNotes(request.getNotes() != null ? request.getNotes() : job.getHandlingNotes());
        assignment.setAssignedByUserId(principal.userId());
        assignment.setAssignedByName(principal.email() != null ? principal.email() : "Branch Dispatcher");
        assignment.setAssignedAt(now);

        AssignmentHistoryRecord historyEntry = new AssignmentHistoryRecord();
        historyEntry.setToCourierId(courier.getId());
        historyEntry.setToCourierName(courier.getName());
        historyEntry.setReason(request.getReason() != null && !request.getReason().isBlank()
                ? request.getReason().trim()
                : "Initial last-mile delivery dispatch allocation");
        historyEntry.setAssignedBy(assignment.getAssignedByName());
        historyEntry.setRecordedAt(now);
        assignment.addHistoryEntry(historyEntry);

        job.setStatus(DeliveryJobStatus.ASSIGNED);
        job.setAssignedCourierId(courier.getId());
        job.setAssignedCourierCode(courier.getCourierCode());
        job.setAssignedCourierName(courier.getName());
        job.setAssignedCourierPhone(courier.getPhone());
        job.setAssignedCourierVehicle(courier.getVehicleType().getDisplayName());
        job.setAssignedAt(now);
        deliveryJobRepository.save(job);

        CourierAssignment savedAssignment = assignmentRepository.save(assignment);
        refreshCourierAvailabilityStatus(courier);

        String actorRole = principal.isAdmin() ? "ADMIN" : "DISPATCHER";

        // For same-branch orders dispatched directly to the destination user without arriving at the branch hub,
        // ensure the order transitions through PICKUP_ASSIGNED -> PICKED_UP before OUT_FOR_DELIVERY.
        if (job.getOriginBranchId() != null && job.getOriginBranchId().equals(job.getDestinationBranchId())) {
            Optional<PickupTask> pickupOpt = pickupTaskRepository.findByOrderId(job.getOrderId());
            if (pickupOpt.isPresent()) {
                PickupTask pickupTask = pickupOpt.get();
                if (pickupTask.getStatus() != PickupTaskStatus.PICKED_UP
                        && pickupTask.getStatus() != PickupTaskStatus.BRANCH_RECEIVED) {
                    if (pickupTask.getStatus() == PickupTaskStatus.PENDING_ASSIGNMENT
                            && pickupTask.getPickupMethod() == PickupMethod.COURIER_PICKUP) {
                        OrderStatusTransitionPayload assignPayload = new OrderStatusTransitionPayload(
                                "PICKUP_ASSIGNED",
                                job.getBranchName(),
                                "Courier " + courier.getName() + " (" + courier.getCourierCode() + ") assigned for direct same-branch pickup & delivery"
                        );
                        assignPayload.setCourierId(courier.getCourierCode());
                        assignPayload.setCourierName(courier.getName());
                        orderServiceClient.notifyStatusTransition(job.getOrderId(), assignPayload, principal.userId(), actorRole);
                    }
                    pickupTask.setStatus(PickupTaskStatus.PICKED_UP);
                    pickupTask.setPickedUpAt(now);
                    pickupTask.setCompletedAt(now);
                    pickupTaskRepository.save(pickupTask);

                    if (pickupTask.getPickupMethod() == PickupMethod.COURIER_PICKUP) {
                        OrderStatusTransitionPayload pickedPayload = new OrderStatusTransitionPayload(
                                "PICKED_UP",
                                job.getPickupAddress(),
                                "Parcel collected by courier " + courier.getName() + " (" + courier.getCourierCode() + ") for same-branch direct delivery"
                        );
                        pickedPayload.setCourierId(courier.getCourierCode());
                        pickedPayload.setCourierName(courier.getName());
                        orderServiceClient.notifyStatusTransition(job.getOrderId(), pickedPayload, principal.userId(), actorRole);
                    }
                }
            } else {
                OrderStatusTransitionPayload assignPayload = new OrderStatusTransitionPayload(
                        "PICKUP_ASSIGNED",
                        job.getBranchName(),
                        "Courier " + courier.getName() + " (" + courier.getCourierCode() + ") assigned for direct same-branch pickup & delivery"
                );
                assignPayload.setCourierId(courier.getCourierCode());
                assignPayload.setCourierName(courier.getName());
                orderServiceClient.notifyStatusTransition(job.getOrderId(), assignPayload, principal.userId(), actorRole);

                OrderStatusTransitionPayload pickedPayload = new OrderStatusTransitionPayload(
                        "PICKED_UP",
                        job.getPickupAddress(),
                        "Parcel collected by courier " + courier.getName() + " (" + courier.getCourierCode() + ") for same-branch direct delivery"
                );
                pickedPayload.setCourierId(courier.getCourierCode());
                pickedPayload.setCourierName(courier.getName());
                orderServiceClient.notifyStatusTransition(job.getOrderId(), pickedPayload, principal.userId(), actorRole);
            }
        }

        // Notify Order Service of OUT_FOR_DELIVERY
        OrderStatusTransitionPayload statusPayload = new OrderStatusTransitionPayload(
                "OUT_FOR_DELIVERY",
                job.getBranchName(),
                "Courier " + courier.getName() + " (" + courier.getCourierCode() + ") assigned for last-mile delivery"
        );
        statusPayload.setCourierId(courier.getCourierCode());
        statusPayload.setCourierName(courier.getName());
        statusPayload.setCourierPhone(courier.getPhone());
        statusPayload.setCourierVehicle(courier.getVehicleType().getDisplayName());
        orderServiceClient.notifyStatusTransition(
                job.getOrderId(),
                statusPayload,
                principal.userId(),
                actorRole
        );

        eventPublisher.publishEvent(
                "dispatch.courier.assigned",
                "CourierAssigned",
                Map.of(
                        "assignmentType", "DELIVERY",
                        "assignmentCode", savedAssignment.getAssignmentCode(),
                        "jobCode", job.getJobCode(),
                        "orderId", job.getOrderId(),
                        "trackingNumber", job.getTrackingNumber(),
                        "courierCode", courier.getCourierCode(),
                        "courierName", courier.getName()
                )
        );
        eventPublisher.publishEvent(
                "dispatch.delivery.out_for_delivery",
                "OutForDelivery",
                Map.of(
                        "assignmentCode", savedAssignment.getAssignmentCode(),
                        "jobCode", job.getJobCode(),
                        "orderId", job.getOrderId(),
                        "trackingNumber", job.getTrackingNumber(),
                        "branchId", job.getBranchId(),
                        "branchName", job.getBranchName() != null ? job.getBranchName() : "",
                        "courierCode", courier.getCourierCode(),
                        "courierName", courier.getName()
                )
        );

        return toAssignmentRecordDto(savedAssignment);
    }

    public AssignmentRecordDto reassignCourier(
            String assignmentIdOrCode,
            ReassignCourierRequest request,
            DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN roles can reassign couriers");

        CourierAssignment assignment = resolveAssignment(assignmentIdOrCode);
        enforceBranchAccess(principal, assignment.getBranchId(),
                "reassign courier in branch " + assignment.getBranchId());

        if (assignment.getStatus() == AssignmentStatus.DELIVERED
                || assignment.getStatus() == AssignmentStatus.CANCELLED) {
            throw new DispatchValidationException(
                    "CANNOT_REASSIGN_COMPLETED",
                    "Cannot reassign a delivery that is already completed or cancelled"
            );
        }

        if (assignment.getDeliveryJob() != null
                && (assignment.getDeliveryJob().getStatus() == DeliveryJobStatus.PENDING_DISPATCHER_DECISION
                || assignment.getDeliveryJob().getAttemptCount() >= assignment.getDeliveryJob().getMaxAttempts())) {
            throw new DispatchValidationException(
                    "PENDING_EXCEPTION_DECISION",
                    "Cannot reassign a job awaiting dispatcher decision after maximum failed attempts"
            );
        }

        CourierProfileEntity previousCourier = assignment.getCourier();
        CourierProfileEntity newCourier = resolveCourier(request.getNewCourierId());

        if (previousCourier.getId().equals(newCourier.getId())) {
            throw new DispatchValidationException(
                    "SAME_COURIER_REASSIGNMENT",
                    "Selected courier is already assigned to this delivery"
            );
        }

        BigDecimal taskWeight = assignment.getDeliveryJob() != null
                ? assignment.getDeliveryJob().getWeightKg()
                : (assignment.getPickupTask() != null ? assignment.getPickupTask().getWeightKg() : BigDecimal.ONE);

        validateCourierEligibilityForTask(newCourier, assignment.getBranchId(), taskWeight, principal);

        LocalDateTime now = LocalDateTime.now();
        assignment.setCourier(newCourier);
        assignment.setStatus(AssignmentStatus.REASSIGNED);
        assignment.setAcceptedAt(null);
        assignment.setAssignedAt(now);

        String assignedByLabel = principal.email() != null
                ? principal.email()
                : "Dispatcher (" + principal.userId() + ")";

        AssignmentHistoryRecord historyEntry = new AssignmentHistoryRecord();
        historyEntry.setFromCourierId(previousCourier.getId());
        historyEntry.setFromCourierName(previousCourier.getName());
        historyEntry.setToCourierId(newCourier.getId());
        historyEntry.setToCourierName(newCourier.getName());
        historyEntry.setReason(request.getReason().trim());
        historyEntry.setAssignedBy(assignedByLabel);
        historyEntry.setRecordedAt(now);
        assignment.addHistoryEntry(historyEntry);

        if (assignment.getDeliveryJob() != null) {
            DeliveryJob job = assignment.getDeliveryJob();
            job.setStatus(DeliveryJobStatus.ASSIGNED);
            job.setAssignedCourierId(newCourier.getId());
            job.setAssignedCourierCode(newCourier.getCourierCode());
            job.setAssignedCourierName(newCourier.getName());
            job.setAssignedCourierPhone(newCourier.getPhone());
            job.setAssignedCourierVehicle(newCourier.getVehicleType().getDisplayName());
            job.setAssignedAt(now);
            deliveryJobRepository.save(job);
        }
        if (assignment.getPickupTask() != null) {
            PickupTask pickupTask = assignment.getPickupTask();
            pickupTask.setStatus(PickupTaskStatus.ASSIGNED);
            pickupTask.setAssignedCourierId(newCourier.getId());
            pickupTask.setAssignedCourierCode(newCourier.getCourierCode());
            pickupTask.setAssignedCourierName(newCourier.getName());
            pickupTaskRepository.save(pickupTask);
        }

        CourierAssignment saved = assignmentRepository.save(assignment);
        refreshCourierAvailabilityStatus(previousCourier);
        refreshCourierAvailabilityStatus(newCourier);

        eventPublisher.publishEvent(
                "dispatch.courier.assigned",
                "CourierAssigned",
                Map.of(
                        "assignmentType", "REASSIGNMENT",
                        "assignmentCode", saved.getAssignmentCode(),
                        "orderId", saved.getOrderId(),
                        "trackingNumber", saved.getTrackingNumber(),
                        "fromCourierCode", previousCourier.getCourierCode(),
                        "toCourierCode", newCourier.getCourierCode(),
                        "courierCode", newCourier.getCourierCode(),
                        "courierName", newCourier.getName(),
                        "reason", request.getReason().trim()
                )
        );

        return toAssignmentRecordDto(saved);
    }

    @Transactional(readOnly = true)
    public List<AssignmentRecordDto> listAssignments(
            Long branchIdFilter,
            String statusFilter,
            DispatchUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        if (principal.isCourier() && !principal.isDispatcher() && !principal.isAdmin()) {
            CourierProfileEntity courier = resolveOrProvisionCurrentCourier(principal);
            return assignmentRepository.findByCourierIdOrderByAssignedAtDesc(courier.getId())
                    .stream()
                    .map(this::toAssignmentRecordDto)
                    .toList();
        }

        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN can list branch assignments");
        Long effectiveBranchId = resolveScopedBranchId(principal, branchIdFilter);

        List<CourierAssignment> list = effectiveBranchId != null
                ? assignmentRepository.findByBranchIdOrderByAssignedAtDesc(effectiveBranchId)
                : assignmentRepository.findAllByOrderByAssignedAtDesc();

        if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
            String norm = statusFilter.trim().toUpperCase();
            list = list.stream()
                    .filter(a -> a.getStatus().name().equalsIgnoreCase(norm))
                    .toList();
        }

        return list.stream().map(this::toAssignmentRecordDto).toList();
    }

    @Transactional(readOnly = true)
    public AssignmentRecordDto getAssignmentById(String assignmentIdOrCode, DispatchUserPrincipal principal) {
        CourierAssignment assignment = resolveAssignment(assignmentIdOrCode);
        verifyCourierOrDispatcherAccess(assignment, principal);
        return toAssignmentRecordDto(assignment);
    }

    @Transactional(readOnly = true)
    public List<AssignmentRecordDto.AssignmentHistoryEntryDto> getAssignmentHistory(
            String assignmentIdOrCode,
            DispatchUserPrincipal principal) {
        CourierAssignment assignment = resolveAssignment(assignmentIdOrCode);
        verifyCourierOrDispatcherAccess(assignment, principal);
        return toAssignmentRecordDto(assignment).getHistory();
    }

    @Transactional(readOnly = true)
    public List<DeliveryJobDto> getMyCourierJobs(DispatchUserPrincipal principal) {
        return getMyCourierJobs(null, null, null, principal);
    }

    /**
     * Jobs of the logged-in courier, optionally filtered by status and by assigned date range.
     * status: a single AssignmentStatus, "PENDING" (ASSIGNED+ACCEPTED), "ACTIVE" (not finished) or "ALL"/blank.
     */
    @Transactional(readOnly = true)
    public List<DeliveryJobDto> getMyCourierJobs(
            String status, LocalDate from, LocalDate to, DispatchUserPrincipal principal) {
        requireCourierRole(principal);
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("The to date must not be before the from date");
        }
        Set<AssignmentStatus> wanted = parseStatusFilter(status);
        CourierProfileEntity courier = resolveOrProvisionCurrentCourier(principal);
        return assignmentRepository.findByCourierIdOrderByAssignedAtDesc(courier.getId()).stream()
                .filter(a -> wanted == null || wanted.contains(a.getStatus()))
                .filter(a -> from == null || (a.getAssignedAt() != null && !a.getAssignedAt().toLocalDate().isBefore(from)))
                .filter(a -> to == null || (a.getAssignedAt() != null && !a.getAssignedAt().toLocalDate().isAfter(to)))
                .map(this::toCourierJobDtoFromAssignment)
                .toList();
    }

    /** One job of the logged-in courier; a job owned by another courier is refused with 403. */
    @Transactional(readOnly = true)
    public DeliveryJobDto getMyCourierJobDetail(String assignmentIdOrCode, DispatchUserPrincipal principal) {
        requireCourierRole(principal);
        CourierAssignment assignment = resolveAssignment(assignmentIdOrCode);
        verifyCourierOrDispatcherAccess(assignment, principal);
        return toCourierJobDtoFromAssignment(assignment);
    }

    /**
     * Dashboard counters for one day (default today). Unfinished jobs always count as work for the day;
     * finished jobs count on the day they were completed. CANCELLED is ignored; REASSIGNED counts as pending.
     */
    @Transactional(readOnly = true)
    public CourierSummaryDto getMyCourierSummary(LocalDate date, DispatchUserPrincipal principal) {
        requireCourierRole(principal);
        LocalDate day = date != null ? date : LocalDate.now();
        CourierProfileEntity courier = resolveOrProvisionCurrentCourier(principal);

        long pending = 0;
        long inProgress = 0;
        long completed = 0;
        long failed = 0;
        int active = 0;
        for (CourierAssignment a : assignmentRepository.findByCourierIdOrderByAssignedAtDesc(courier.getId())) {
            boolean finishedToday = a.getCompletedAt() != null && a.getCompletedAt().toLocalDate().equals(day);
            switch (a.getStatus()) {
                case ASSIGNED, REASSIGNED, ACCEPTED -> { pending++; active++; }
                case IN_TRANSIT -> { inProgress++; active++; }
                case DELIVERED -> { if (finishedToday) completed++; }
                case FAILED -> { if (finishedToday) failed++; }
                default -> { }
            }
        }

        CourierSummaryDto dto = new CourierSummaryDto();
        dto.setDate(day.toString());
        dto.setPending(pending);
        dto.setInProgress(inProgress);
        dto.setCompleted(completed);
        dto.setFailed(failed);
        dto.setTotalAssigned(pending + inProgress + completed + failed);
        dto.setActiveWorkload(active);
        int max = Math.max(1, courier.getMaxCapacity());
        dto.setMaxConcurrent(max);
        int pct = Math.min(100, (int) Math.round(active * 100.0 / max));
        dto.setWorkloadPercent(pct);
        dto.setWorkloadLevel(pct >= 80 ? "HIGH" : pct >= 50 ? "MEDIUM" : "LOW");
        return dto;
    }

    private static final long MAX_POD_PHOTO_BYTES = 5L * 1024 * 1024;

    /** Stores a proof-of-delivery photo for one of the courier own jobs and returns its evidence reference. */
    public String storeCourierPodPhoto(String assignmentIdOrCode, byte[] content, String contentType,
                                       DispatchUserPrincipal principal) {
        requireCourierRole(principal);
        CourierAssignment assignment = resolveDeliveryAssignment(assignmentIdOrCode);
        verifyCourierOrDispatcherAccess(assignment, principal);
        if (assignment.getDeliveryJob() == null) {
            throw new DispatchValidationException("NOT_A_DELIVERY_JOB",
                    "Proof-of-delivery photos can only be uploaded for delivery jobs");
        }
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("Photo file is empty");
        }
        if (content.length > MAX_POD_PHOTO_BYTES) {
            throw new DispatchValidationException("POD_PHOTO_TOO_LARGE", "Photo must be 5 MB or smaller");
        }
        String type = contentType == null ? "" : contentType.trim().toLowerCase();
        if (!type.equals("image/jpeg") && !type.equals("image/png")) {
            throw new DispatchValidationException("POD_PHOTO_UNSUPPORTED_TYPE", "Only JPEG or PNG photos are accepted");
        }
        String dataUri = "data:" + type + ";base64," + Base64.getEncoder().encodeToString(content);
        return podEvidenceStorageService.storeEvidenceReference(
                assignment.getDeliveryJob().getTrackingNumber(), "photo", dataUri);
    }

    private Set<AssignmentStatus> parseStatusFilter(String status) {
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status.trim())) {
            return null;
        }
        String v = status.trim().toUpperCase();
        if ("PENDING".equals(v)) {
            return EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.REASSIGNED, AssignmentStatus.ACCEPTED);
        }
        if ("ACTIVE".equals(v)) {
            return EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.REASSIGNED,
                    AssignmentStatus.ACCEPTED, AssignmentStatus.IN_TRANSIT);
        }
        if ("ASSIGNED".equals(v)) {
            return EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.REASSIGNED);
        }
        try {
            return EnumSet.of(AssignmentStatus.valueOf(v));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid status filter: " + status);
        }
    }

    // -------------------------------------------------------------------------
    // Idempotent courier actions (Idempotency-Key header)
    // -------------------------------------------------------------------------

    @Autowired(required = false)
    private CourierIdempotencyRepository idempotencyRepository;

    @Autowired(required = false)
    private ObjectMapper idempotencyMapper;

    public DeliveryJobDto acceptAssignment(String id, DispatchUserPrincipal principal, String idempotencyKey) {
        return runIdempotent(idempotencyKey, "ACCEPT", id, null, principal,
                () -> acceptAssignment(id, principal));
    }

    public DeliveryJobDto markPickedUp(String id, DispatchUserPrincipal principal, String idempotencyKey) {
        return runIdempotent(idempotencyKey, "PICKUP", id, null, principal,
                () -> markPickedUp(id, principal));
    }

    public DeliveryJobDto completeDelivery(String id, ProofOfDeliveryRequest req,
                                           DispatchUserPrincipal principal, String idempotencyKey) {
        return runIdempotent(idempotencyKey, "DELIVER", id, req, principal,
                () -> completeDelivery(id, req, principal));
    }

    public DeliveryJobDto recordFailedDelivery(String id, FailedDeliveryRequest req,
                                               DispatchUserPrincipal principal, String idempotencyKey) {
        return runIdempotent(idempotencyKey, "FAIL", id, req, principal,
                () -> recordFailedDelivery(id, req, principal));
    }

    private DeliveryJobDto runIdempotent(String key, String operation, String assignmentRef, Object body,
                                         DispatchUserPrincipal principal, Supplier<DeliveryJobDto> action) {
        if (key == null || key.isBlank() || idempotencyRepository == null || idempotencyMapper == null
                || principal == null || principal.userId() == null) {
            return action.get();
        }
        String trimmedKey = key.trim();
        if (trimmedKey.length() > 100) {
            throw new IllegalArgumentException("Idempotency-Key must be at most 100 characters");
        }
        String actor = principal.userId();
        String hash = requestHash(operation, assignmentRef, body);

        Optional<CourierIdempotencyRecord> existing =
                idempotencyRepository.findByActorIdAndIdempotencyKey(actor, trimmedKey);
        if (existing.isPresent()) {
            CourierIdempotencyRecord rec = existing.get();
            if (!rec.getRequestHash().equals(hash)) {
                throw new IdempotencyConflictException("Idempotency-Key was already used for a different request");
            }
            try {
                return idempotencyMapper.readValue(rec.getResponseJson(), DeliveryJobDto.class);
            } catch (Exception ex) {
                throw new IllegalStateException("Stored idempotent response could not be read", ex);
            }
        }

        DeliveryJobDto result = action.get();
        try {
            idempotencyRepository.saveAndFlush(new CourierIdempotencyRecord(
                    trimmedKey, actor, operation, assignmentRef, hash,
                    idempotencyMapper.writeValueAsString(result)));
        } catch (DataIntegrityViolationException ex) {
            throw new IdempotencyConflictException("An identical request is already being processed");
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new IllegalStateException("Could not store idempotent response", ex);
        }
        return result;
    }

    private String requestHash(String operation, String assignmentRef, Object body) {
        try {
            String raw = operation + "|" + assignmentRef + "|"
                    + (body == null ? "" : idempotencyMapper.writeValueAsString(body));
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not hash request", ex);
        }
    }

    // =========================================================================
    // 4. COURIER EXECUTION: ACCEPT, PICKUP, DELIVER (POD), FAIL (MAX 3 RETRIES)
    // =========================================================================

    public DeliveryJobDto acceptAssignment(String assignmentIdOrCode, DispatchUserPrincipal principal) {
        CourierAssignment assignment = resolveAssignment(assignmentIdOrCode);
        if (principal == null || (!principal.isCourier() && !principal.isAdmin())) {
            throw new AccessDeniedException("Only the assigned courier may accept an assignment");
        }
        verifyCourierOrDispatcherAccess(assignment, principal);
        enforceCourierLifecycle(assignment, principal, CourierLifecycle.ACCEPT);

        if (assignment.getStatus() == AssignmentStatus.DELIVERED
                || assignment.getStatus() == AssignmentStatus.CANCELLED
                || assignment.getStatus() == AssignmentStatus.FAILED) {
            throw new DispatchValidationException(
                    "INVALID_ASSIGNMENT_STATE",
                    "Assignment " + assignment.getAssignmentCode() + " in state " + assignment.getStatus() + " cannot be accepted"
            );
        }

        LocalDateTime now = LocalDateTime.now();
        assignment.setStatus(AssignmentStatus.ACCEPTED);
        assignment.setAcceptedAt(now);

        if (assignment.getPickupTask() != null) {
            PickupTask pickupTask = assignment.getPickupTask();
            pickupTask.setStatus(PickupTaskStatus.ACCEPTED);
            pickupTaskRepository.save(pickupTask);
        }
        if (assignment.getDeliveryJob() != null) {
            DeliveryJob job = assignment.getDeliveryJob();
            job.setStatus(DeliveryJobStatus.ACCEPTED);
            job.setAcceptedAt(now);
            deliveryJobRepository.save(job);
        }

        CourierAssignment saved = assignmentRepository.save(assignment);
        return toCourierJobDtoFromAssignment(saved);
    }

    public DeliveryJobDto markPickedUp(String assignmentIdOrCode, DispatchUserPrincipal principal) {
        CourierAssignment assignment = resolveAssignment(assignmentIdOrCode);
        verifyCourierOrDispatcherAccess(assignment, principal);
        enforceCourierLifecycle(assignment, principal, CourierLifecycle.PICKUP);

        if (assignment.getStatus() == AssignmentStatus.DELIVERED
                || assignment.getStatus() == AssignmentStatus.CANCELLED) {
            throw new DispatchValidationException(
                    "INVALID_ASSIGNMENT_STATE",
                    "Assignment " + assignment.getAssignmentCode() + " is already completed or cancelled"
            );
        }

        LocalDateTime now = LocalDateTime.now();
        String actorRole = principal.isAdmin() ? "ADMIN" : (principal.isDispatcher() ? "DISPATCHER" : "COURIER");

        if (assignment.getTaskType() == AssignmentTaskType.PICKUP && assignment.getPickupTask() != null) {
            PickupTask pickupTask = assignment.getPickupTask();
            pickupTask.setStatus(PickupTaskStatus.PICKED_UP);
            pickupTask.setPickedUpAt(now);
            pickupTask.setCompletedAt(now);
            pickupTaskRepository.save(pickupTask);

            assignment.setStatus(AssignmentStatus.DELIVERED);
            assignment.setPickedUpAt(now);
            assignment.setCompletedAt(now);
            CourierAssignment saved = assignmentRepository.save(assignment);

            CourierProfileEntity courier = assignment.getCourier();
            courier.setCompletedToday(courier.getCompletedToday() + 1);
            courier.setTotalCompletedLifetime(courier.getTotalCompletedLifetime() + 1);
            courier.setLastActiveAt(now);
            courierRepository.save(courier);
            refreshCourierAvailabilityStatus(courier);

            // Notify Order Service of PICKED_UP
            OrderStatusTransitionPayload pickedUpPayload = new OrderStatusTransitionPayload(
                    "PICKED_UP",
                    pickupTask.getPickupAddress(),
                    "Parcel collected from sender by courier " + courier.getName() + " (" + courier.getCourierCode() + ")"
            );
            pickedUpPayload.setCourierId(courier.getCourierCode());
            pickedUpPayload.setCourierName(courier.getName());
            orderServiceClient.notifyStatusTransition(pickupTask.getOrderId(), pickedUpPayload, principal.userId(), actorRole);

            eventPublisher.publishEvent(
                    "dispatch.parcel.picked_up",
                    "ParcelPickedUp",
                    Map.of(
                            "assignmentCode", saved.getAssignmentCode(),
                            "taskCode", pickupTask.getTaskCode(),
                            "orderId", pickupTask.getOrderId(),
                            "trackingNumber", pickupTask.getTrackingNumber(),
                            "courierCode", courier.getCourierCode(),
                            "courierName", courier.getName()
                    )
            );

            if (pickupTask.isSameBranch()) {
                // Same-branch parcel does NOT arrive at the branch hub; it is sent directly to the destination user via the dispatcher
                if (!deliveryJobRepository.existsByOrderId(pickupTask.getOrderId())) {
                    DeliveryJob sameBranchJob = buildDeliveryJobFromPickupTask(pickupTask);
                    deliveryJobRepository.save(sameBranchJob);
                }
            } else {
                // Inter-branch parcel arrives at the origin branch so the dispatcher can send it to inter-branch transport
                OrderStatusTransitionPayload originBranchPayload = new OrderStatusTransitionPayload(
                        "AT_ORIGIN_BRANCH",
                        pickupTask.getOriginBranchName(),
                        "Parcel handed over to origin branch (" + pickupTask.getOriginBranchName() + ")"
                );
                orderServiceClient.notifyStatusTransition(pickupTask.getOrderId(), originBranchPayload, principal.userId(), actorRole);

                eventPublisher.publishEvent(
                        "dispatch.parcel.received_at_branch",
                        "ParcelReceivedAtBranch",
                        Map.of(
                                "taskCode", pickupTask.getTaskCode(),
                                "orderId", pickupTask.getOrderId(),
                                "trackingNumber", pickupTask.getTrackingNumber(),
                                "branchId", pickupTask.getOriginBranchId(),
                                "branchName", pickupTask.getOriginBranchName() != null ? pickupTask.getOriginBranchName() : "",
                                "pickupMethod", "COURIER_PICKUP",
                                "courierCode", courier.getCourierCode()
                        )
                );
            }

            return toCourierJobDtoFromAssignment(saved);
        }

        // Delivery job pickup from branch / start transit
        assignment.setStatus(AssignmentStatus.IN_TRANSIT);
        assignment.setPickedUpAt(now);

        if (assignment.getDeliveryJob() != null) {
            DeliveryJob job = assignment.getDeliveryJob();
            job.setStatus(DeliveryJobStatus.IN_TRANSIT);
            job.setPickedUpAt(now);
            deliveryJobRepository.save(job);

            OrderStatusTransitionPayload transitPayload = new OrderStatusTransitionPayload(
                    "OUT_FOR_DELIVERY",
                    job.getBranchName(),
                    "Courier " + assignment.getCourier().getName() + " departed branch for final-mile delivery"
            );
            transitPayload.setCourierId(assignment.getCourier().getCourierCode());
            transitPayload.setCourierName(assignment.getCourier().getName());
            orderServiceClient.notifyStatusTransition(job.getOrderId(), transitPayload, principal.userId(), actorRole);
        }

        CourierAssignment saved = assignmentRepository.save(assignment);
        return toCourierJobDtoFromAssignment(saved);
    }

    /**
     * Requirement 5 & 6: Record successful last-mile delivery with Proof of Delivery (BD-08).
     */
    public DeliveryJobDto completeDelivery(
            String assignmentOrJobId,
            ProofOfDeliveryRequest podRequest,
            DispatchUserPrincipal principal) {

        CourierAssignment assignment = resolveDeliveryAssignment(assignmentOrJobId);
        verifyCourierOrDispatcherAccess(assignment, principal);
        if (assignment.getDeliveryJob() != null
                && assignment.getDeliveryJob().getStatus() != DeliveryJobStatus.DELIVERED
                && assignment.getDeliveryJob().getStatus() != DeliveryJobStatus.PENDING_DISPATCHER_DECISION) {
            enforceCourierLifecycle(assignment, principal, CourierLifecycle.DELIVER);
        }

        DeliveryJob job = assignment.getDeliveryJob();
        if (job == null) {
            throw new DispatchValidationException(
                    "NOT_A_DELIVERY_JOB",
                    "Assignment " + assignment.getAssignmentCode() + " is a pickup task; use /pickup to record collection"
            );
        }

        if (job.getStatus() == DeliveryJobStatus.DELIVERED) {
            throw new DispatchValidationException("ALREADY_DELIVERED", "Delivery job " + job.getJobCode() + " is already delivered");
        }
        if (job.getStatus() == DeliveryJobStatus.PENDING_DISPATCHER_DECISION) {
            throw new DispatchValidationException(
                    "PENDING_EXCEPTION_DECISION",
                    "Delivery job " + job.getJobCode() + " is awaiting dispatcher decision after maximum failed attempts"
            );
        }

        PodEvidenceStorageService.ValidatedPodEvidence validatedPod =
                podEvidenceStorageService.validateAndStoreEvidence(job.getTrackingNumber(), podRequest);

        LocalDateTime now = LocalDateTime.now();
        CourierProfileEntity courier = assignment.getCourier();

        int attemptNumber = job.getAttemptCount() + 1;
        job.setAttemptCount(attemptNumber);
        job.setStatus(DeliveryJobStatus.DELIVERED);
        job.setDeliveredAt(now);
        job.setCompletedAt(now);

        DeliveryAttempt attempt = new DeliveryAttempt();
        attempt.setAssignment(assignment);
        attempt.setOrderId(job.getOrderId());
        attempt.setTrackingNumber(job.getTrackingNumber());
        attempt.setAttemptNumber(attemptNumber);
        attempt.setOutcome(AttemptOutcome.SUCCESS);
        attempt.setNotes(podRequest != null ? podRequest.getNotes() : "Delivered successfully");
        attempt.setCourierId(courier.getId());
        attempt.setCourierCode(courier.getCourierCode());
        attempt.setCourierName(courier.getName());
        attempt.setAttemptedAt(now);
        job.addAttempt(attempt);

        ProofOfDelivery pod = podRepository.findByDeliveryJobId(job.getId()).orElseGet(ProofOfDelivery::new);
        pod.setAssignmentId(assignment.getId());
        pod.setOrderId(job.getOrderId());
        pod.setTrackingNumber(job.getTrackingNumber());
        pod.setParcelReference(podRequest.getParcelReference() != null && !podRequest.getParcelReference().isBlank()
                ? podRequest.getParcelReference().trim()
                : "PRC-" + job.getTrackingNumber());
        pod.setRecipientName(validatedPod.recipientName());
        pod.setProofType(validatedPod.proofType());
        pod.setSignatureReference(validatedPod.signatureReference());
        pod.setPhotoEvidenceReference(validatedPod.photoEvidenceReference());
        pod.setOtpReference(validatedPod.otpReference());
        pod.setCourierId(courier.getId());
        pod.setCourierCode(courier.getCourierCode());
        pod.setCourierName(courier.getName());
        pod.setDeliveredAt(now);
        pod.setNotes(podRequest.getNotes());
        job.attachProofOfDelivery(pod);

        deliveryJobRepository.save(job);

        assignment.setStatus(AssignmentStatus.DELIVERED);
        assignment.setCompletedAt(now);
        CourierAssignment savedAssignment = assignmentRepository.save(assignment);

        courier.setCompletedToday(courier.getCompletedToday() + 1);
        courier.setTotalCompletedLifetime(courier.getTotalCompletedLifetime() + 1);
        courier.setLastActiveAt(now);
        courierRepository.save(courier);
        refreshCourierAvailabilityStatus(courier);

        // Notify Order Service of DELIVERED with POD references
        String actorRole = principal.isAdmin() ? "ADMIN" : (principal.isDispatcher() ? "DISPATCHER" : "COURIER");
        OrderStatusTransitionPayload deliveredPayload = new OrderStatusTransitionPayload(
                "DELIVERED",
                job.getDeliveryAddress(),
                "Parcel delivered to " + validatedPod.recipientName() + " (" + validatedPod.proofType() + " verified)"
        );
        deliveredPayload.setCourierId(courier.getCourierCode());
        deliveredPayload.setCourierName(courier.getName());
        deliveredPayload.setRecipientConfirmedName(validatedPod.recipientName());
        deliveredPayload.setSignatureReference(validatedPod.signatureReference() != null
                ? validatedPod.signatureReference()
                : validatedPod.primaryReference());
        deliveredPayload.setPhotoEvidenceUrl(validatedPod.photoEvidenceReference());
        orderServiceClient.notifyStatusTransition(job.getOrderId(), deliveredPayload, principal.userId(), actorRole);

        eventPublisher.publishEvent(
                "dispatch.delivery.completed",
                "DeliveryCompleted",
                Map.of(
                        "assignmentCode", savedAssignment.getAssignmentCode(),
                        "jobCode", job.getJobCode(),
                        "orderId", job.getOrderId(),
                        "trackingNumber", job.getTrackingNumber(),
                        "recipientName", validatedPod.recipientName(),
                        "proofType", validatedPod.proofType().name(),
                        "courierCode", courier.getCourierCode(),
                        "courierName", courier.getName()
                )
        );

        return toCourierJobDtoFromAssignment(savedAssignment);
    }

    /**
     * Requirement 5 & 7: Record failed delivery attempt with structured reason.
     * Enforces maximum of 3 delivery attempts (BD-02). After 3 unsuccessful attempts,
     * moves the job to PENDING_DISPATCHER_DECISION and creates a DeliveryException (BD-07).
     */
    public DeliveryJobDto recordFailedDelivery(
            String assignmentOrJobId,
            FailedDeliveryRequest failRequest,
            DispatchUserPrincipal principal) {

        if (failRequest == null || failRequest.getReason() == null || failRequest.getReason().isBlank()) {
            throw new IllegalArgumentException("Structured failure reason is required");
        }

        CourierAssignment assignment = resolveDeliveryAssignment(assignmentOrJobId);
        verifyCourierOrDispatcherAccess(assignment, principal);

        DeliveryJob job = assignment.getDeliveryJob();
        if (job == null) {
            throw new DispatchValidationException(
                    "NOT_A_DELIVERY_JOB",
                    "Assignment " + assignment.getAssignmentCode() + " is not a delivery job"
            );
        }
        if (job.getStatus() != DeliveryJobStatus.DELIVERED && job.getStatus() != DeliveryJobStatus.CANCELLED
                && job.getStatus() != DeliveryJobStatus.PENDING_DISPATCHER_DECISION
                && job.getAttemptCount() < job.getMaxAttempts()) {
            enforceCourierLifecycle(assignment, principal, CourierLifecycle.FAIL);
        }

        if (job.getStatus() == DeliveryJobStatus.DELIVERED || job.getStatus() == DeliveryJobStatus.CANCELLED) {
            throw new DispatchValidationException(
                    "INVALID_JOB_STATE",
                    "Cannot record a failed attempt on a " + job.getStatus() + " delivery job"
            );
        }

        if (job.getStatus() == DeliveryJobStatus.PENDING_DISPATCHER_DECISION
                || job.getAttemptCount() >= job.getMaxAttempts()) {
            throw new DispatchValidationException(
                    "MAX_ATTEMPTS_EXCEEDED",
                    "Maximum delivery attempts (" + job.getMaxAttempts()
                            + ") reached for order " + job.getTrackingNumber()
                            + "; awaiting dispatcher exception decision"
            );
        }

        LocalDateTime now = LocalDateTime.now();
        CourierProfileEntity courier = assignment.getCourier();

        int attemptNumber = job.getAttemptCount() + 1;
        job.setAttemptCount(attemptNumber);

        DeliveryAttempt attempt = new DeliveryAttempt();
        attempt.setAssignment(assignment);
        attempt.setOrderId(job.getOrderId());
        attempt.setTrackingNumber(job.getTrackingNumber());
        attempt.setAttemptNumber(attemptNumber);
        attempt.setOutcome(AttemptOutcome.FAILED);
        attempt.setFailureReason(failRequest.getReason().trim());
        attempt.setNotes(failRequest.getNotes());
        attempt.setCourierId(courier.getId());
        attempt.setCourierCode(courier.getCourierCode());
        attempt.setCourierName(courier.getName());
        attempt.setAttemptedAt(now);
        job.addAttempt(attempt);

        assignment.setStatus(AssignmentStatus.FAILED);
        assignment.setCompletedAt(now);
        if (failRequest.getNotes() != null && !failRequest.getNotes().isBlank()) {
            assignment.setNotes(failRequest.getNotes().trim());
        }

        boolean escalatedToDispatcher = attemptNumber >= job.getMaxAttempts();
        if (escalatedToDispatcher) {
            job.setStatus(DeliveryJobStatus.PENDING_DISPATCHER_DECISION);
            job.setCompletedAt(now);

            DeliveryException exception = exceptionRepository
                    .findByDeliveryJobIdAndStatus(job.getId(), ExceptionStatus.PENDING_DECISION)
                    .orElseGet(DeliveryException::new);
            if (exception.getExceptionCode() == null) {
                exception.setExceptionCode("EXC-" + (10000 + random.nextInt(90000)));
            }
            exception.setDeliveryJob(job);
            exception.setOrderId(job.getOrderId());
            exception.setTrackingNumber(job.getTrackingNumber());
            exception.setBranchId(job.getBranchId());
            exception.setBranchCode(job.getBranchCode());
            exception.setBranchName(job.getBranchName());
            exception.setExceptionType(ExceptionType.MAX_ATTEMPTS_EXCEEDED);
            exception.setStatus(ExceptionStatus.PENDING_DECISION);
            exception.setFailedAttemptCount(attemptNumber);
            exception.setLastFailureReason(failRequest.getReason().trim());
            exceptionRepository.save(exception);
        } else {
            job.setStatus(DeliveryJobStatus.FAILED);
        }

        deliveryJobRepository.save(job);
        CourierAssignment savedAssignment = assignmentRepository.save(assignment);
        refreshCourierAvailabilityStatus(courier);

        // Notify Order Service of DELIVERY_FAILED (Order Service automatically transitions to PENDING_DISPATCHER_DECISION on 3rd failure)
        String actorRole = principal.isAdmin() ? "ADMIN" : (principal.isDispatcher() ? "DISPATCHER" : "COURIER");
        OrderStatusTransitionPayload failPayload = new OrderStatusTransitionPayload(
                "DELIVERY_FAILED",
                job.getDeliveryAddress(),
                "Delivery attempt #" + attemptNumber + " failed: " + failRequest.getReason().trim()
        );
        failPayload.setCourierId(courier.getCourierCode());
        failPayload.setCourierName(courier.getName());
        orderServiceClient.notifyStatusTransition(job.getOrderId(), failPayload, principal.userId(), actorRole);

        eventPublisher.publishEvent(
                "dispatch.delivery.attempt_failed",
                "DeliveryAttemptFailed",
                Map.of(
                        "assignmentCode", savedAssignment.getAssignmentCode(),
                        "jobCode", job.getJobCode(),
                        "orderId", job.getOrderId(),
                        "trackingNumber", job.getTrackingNumber(),
                        "attemptNumber", attemptNumber,
                        "maxAttempts", job.getMaxAttempts(),
                        "reason", failRequest.getReason().trim(),
                        "escalatedToDispatcher", escalatedToDispatcher
                )
        );

        return toCourierJobDtoFromAssignment(savedAssignment);
    }

    // =========================================================================
    // 5. DISPATCHER EXCEPTION DECISIONS (AFTER 3 FAILED ATTEMPTS)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<DeliveryExceptionDto> listExceptions(
            Long branchIdFilter,
            String statusFilter,
            DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN roles can view delivery exceptions");
        Long effectiveBranchId = resolveScopedBranchId(principal, branchIdFilter);

        List<DeliveryException> list;
        if (effectiveBranchId != null) {
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                list = exceptionRepository.findByBranchIdAndStatusOrderByCreatedAtDesc(
                        effectiveBranchId,
                        ExceptionStatus.valueOf(statusFilter.trim().toUpperCase())
                );
            } else {
                list = exceptionRepository.findByBranchIdOrderByCreatedAtDesc(effectiveBranchId);
            }
        } else {
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                list = exceptionRepository.findByStatusOrderByCreatedAtDesc(
                        ExceptionStatus.valueOf(statusFilter.trim().toUpperCase())
                );
            } else {
                list = exceptionRepository.findAllByOrderByCreatedAtDesc();
            }
        }

        return list.stream().map(this::toDeliveryExceptionDto).toList();
    }

    public DeliveryExceptionDto resolveException(
            String exceptionIdOrCode,
            ExceptionDecisionRequest request,
            DispatchUserPrincipal principal) {
        requireDispatcherOrAdmin(principal, "Only DISPATCHER or ADMIN roles can resolve delivery exceptions");

        if (request == null || request.getDecisionReason() == null || request.getDecisionReason().isBlank()) {
            throw new IllegalArgumentException("Decision reason is required");
        }

        DeliveryException exception = resolveExceptionEntity(exceptionIdOrCode);
        enforceBranchAccess(principal, exception.getBranchId(),
                "resolve delivery exception in branch " + exception.getBranchId());

        if (exception.getStatus() == ExceptionStatus.RESOLVED) {
            throw new DispatchValidationException(
                    "EXCEPTION_ALREADY_RESOLVED",
                    "Delivery exception " + exception.getExceptionCode() + " has already been resolved"
            );
        }

        DispatcherDecisionAction action = DispatcherDecisionAction.fromValue(request.getDecisionAction());
        LocalDateTime now = LocalDateTime.now();
        String actorRole = principal.isAdmin() ? "ADMIN" : "DISPATCHER";
        String actorName = principal.email() != null ? principal.email() : principal.userId();

        exception.setDecisionAction(action);
        exception.setDecisionReason(request.getDecisionReason().trim());
        exception.setDecidedById(principal.userId());
        exception.setDecidedByName(actorName);
        exception.setDecidedByRole(actorRole);
        exception.setDecidedAt(now);
        exception.setStatus(ExceptionStatus.RESOLVED);

        DeliveryJob job = exception.getDeliveryJob();
        if ((job == null
                || action == DispatcherDecisionAction.WRITE_OFF_LOST
                || action == DispatcherDecisionAction.MARK_FOUND_RESUME
                || action == DispatcherDecisionAction.ACKNOWLEDGE_DAMAGE
                || action == DispatcherDecisionAction.CORRECT_HANDOVER)
                && operationalExceptionService != null) {
            return operationalExceptionService.applyDispatcherDecision(exception, action, request, principal);
        }
        if (job == null) {
            exception.setResolutionNotes(request.getDecisionReason().trim());
            return toDeliveryExceptionDto(exceptionRepository.save(exception));
        }
        switch (action) {
            case RETURN_TO_SENDER -> {
                job.setStatus(DeliveryJobStatus.RETURN_TO_SENDER);
                job.setCompletedAt(now);
                deliveryJobRepository.save(job);

                if (returnTaskService != null) {
                    returnTaskService.initiateFromException(
                            exception,
                            request.getDecisionReason().trim(),
                            principal,
                            false
                    );
                }

                OrderStatusTransitionPayload rtsPayload = new OrderStatusTransitionPayload(
                        "RETURN_TO_SENDER",
                        job.getBranchName(),
                        "Dispatcher decision (" + actorName + "): Return to sender - " + request.getDecisionReason().trim()
                );
                orderServiceClient.notifyStatusTransition(job.getOrderId(), rtsPayload, principal.userId(), actorRole);
            }
            case RESCHEDULE_DELIVERY -> {
                job.setMaxAttempts(job.getAttemptCount() + 1);
                job.setStatus(DeliveryJobStatus.UNASSIGNED);
                job.setCompletedAt(null);
                deliveryJobRepository.save(job);

                OrderStatusTransitionPayload reschedulePayload = new OrderStatusTransitionPayload(
                        "OUT_FOR_DELIVERY",
                        job.getBranchName(),
                        "Dispatcher authorized additional delivery attempt: " + request.getDecisionReason().trim()
                );
                orderServiceClient.notifyStatusTransition(job.getOrderId(), reschedulePayload, principal.userId(), actorRole);
            }
            case HOLD_AT_BRANCH -> {
                job.setStatus(DeliveryJobStatus.UNASSIGNED);
                deliveryJobRepository.save(job);
            }
            default -> {
                exception.setResolutionNotes(request.getDecisionReason().trim());
            }
        }

        DeliveryException saved = exceptionRepository.save(exception);

        eventPublisher.publishEvent(
                "dispatch.exception.resolved",
                "DELIVERY_EXCEPTION_RESOLVED",
                Map.of(
                        "exceptionCode", saved.getExceptionCode(),
                        "jobCode", job.getJobCode(),
                        "orderId", job.getOrderId(),
                        "trackingNumber", job.getTrackingNumber(),
                        "decisionAction", action.name(),
                        "decidedById", principal.userId()
                )
        );

        return toDeliveryExceptionDto(saved);
    }

    // =========================================================================
    // 6. AUTHORIZATION & ELIGIBILITY HELPERS
    // =========================================================================

    private void requireDispatcherOrAdmin(DispatchUserPrincipal principal, String message) {
        if (principal == null || (!principal.isDispatcher() && !principal.isAdmin())) {
            throw new AccessDeniedException(message);
        }
    }

    private void requireCourierRole(DispatchUserPrincipal principal) {
        if (principal == null || (!principal.isCourier() && !principal.isAdmin())) {
            throw new AccessDeniedException("Only COURIER role can access courier endpoints");
        }
    }

    private void enforceBranchAccess(DispatchUserPrincipal principal, Long targetBranchId, String actionDesc) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        if (principal.isAdmin()) {
            return;
        }
        if (!principal.isDispatcher()) {
            throw new AccessDeniedException("Dispatcher or Admin authorization is required to " + actionDesc);
        }
        if (!principal.canManageBranch(targetBranchId)) {
            throw new AccessDeniedException(
                    "Dispatcher scoped to branch " + principal.branchId()
                            + " is not authorized to " + actionDesc
            );
        }
    }

    private Long resolveScopedBranchId(DispatchUserPrincipal principal, Long requestedBranchId) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        if (principal.isAdmin()) {
            return requestedBranchId;
        }
        if (principal.branchId() == null) {
            throw new AccessDeniedException("Branch-scoped staff must have an assigned branchId claim");
        }
        if (requestedBranchId != null && !principal.branchId().equals(requestedBranchId)) {
            throw new AccessDeniedException(
                    "Dispatcher scoped to branch " + principal.branchId()
                            + " cannot query branch " + requestedBranchId
            );
        }
        return principal.branchId();
    }

    /** Couriers must follow ASSIGNED, ACCEPTED, IN_TRANSIT, then DELIVERED or FAILED; dispatchers and admins may override. */
    private void enforceCourierLifecycle(CourierAssignment assignment, DispatchUserPrincipal principal, String action) {
        if (principal != null && principal.isCourier() && !principal.isAdmin() && !principal.isDispatcher()) {
            CourierLifecycle.require(assignment, action);
        }
    }

    private void verifyCourierOrDispatcherAccess(CourierAssignment assignment, DispatchUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        if (principal.isAdmin()) {
            return;
        }
        if (principal.isDispatcher()) {
            enforceBranchAccess(principal, assignment.getBranchId(),
                    "access assignment in branch " + assignment.getBranchId());
            return;
        }
        if (principal.isCourier()) {
            verifyCourierIdentityMatches(assignment.getCourier(), principal);
            return;
        }
        throw new AccessDeniedException("Insufficient permissions to access this operational assignment");
    }

    private void verifyCourierIdentityMatches(CourierProfileEntity courier, DispatchUserPrincipal principal) {
        String userId = principal.userId();
        String email = principal.email();

        boolean matchesUserId = userId != null && (
                userId.equalsIgnoreCase(courier.getUserId())
                        || userId.equalsIgnoreCase(courier.getCourierCode())
                        || userId.equalsIgnoreCase(String.valueOf(courier.getId()))
        );
        boolean matchesEmail = email != null && email.equalsIgnoreCase(courier.getEmail());

        if (!matchesUserId && !matchesEmail) {
            throw new AccessDeniedException("Couriers may only access or update their own assigned tasks");
        }
    }

    private void validateCourierEligibilityForTask(
            CourierProfileEntity courier,
            Long taskBranchId,
            BigDecimal weightKg,
            DispatchUserPrincipal principal) {

        if (taskBranchId != null && !taskBranchId.equals(courier.getBranchId())) {
            throw new DispatchValidationException(
                    "COURIER_BRANCH_MISMATCH",
                    "Courier " + courier.getCourierCode() + " belongs to branch " + courier.getBranchCode()
                            + " and cannot be assigned to a task in branch ID " + taskBranchId
            );
        }

        if (courier.getAvailabilityStatus() == CourierAvailabilityStatus.OFFLINE
                || courier.getAvailabilityStatus() == CourierAvailabilityStatus.ON_BREAK) {
            throw new DispatchValidationException(
                    "COURIER_UNAVAILABLE",
                    "Courier " + courier.getName() + " (" + courier.getCourierCode()
                            + ") is currently " + courier.getAvailabilityStatus() + " and cannot accept assignments"
            );
        }

        long activeWorkload = countActiveWorkload(courier.getId());
        if (activeWorkload >= courier.getMaxCapacity()) {
            throw new DispatchValidationException(
                    "COURIER_AT_CAPACITY",
                    "Courier " + courier.getName() + " (" + courier.getCourierCode()
                            + ") has reached maximum capacity (" + activeWorkload + "/" + courier.getMaxCapacity() + ")"
            );
        }

        if (weightKg != null) {
            BigDecimal maxVehicleWeight = maxWeightForVehicle(courier.getVehicleType());
            if (weightKg.compareTo(maxVehicleWeight) > 0) {
                throw new DispatchValidationException(
                        "COURIER_VEHICLE_WEIGHT_EXCEEDED",
                        "Parcel weight (" + weightKg + " kg) exceeds " + courier.getVehicleType().getDisplayName()
                                + " limit (" + maxVehicleWeight + " kg) for courier " + courier.getCourierCode()
                );
            }
        }
    }

    private BigDecimal maxWeightForVehicle(VehicleType vehicleType) {
        if (vehicleType == null) {
            return new BigDecimal("25.00");
        }
        return switch (vehicleType) {
            case BICYCLE -> new BigDecimal("5.00");
            case MOTORCYCLE -> new BigDecimal("20.00");
            case VAN -> new BigDecimal("150.00");
        };
    }

    public long countActiveWorkload(Long courierId) {
        return assignmentRepository.countByCourierIdAndStatusIn(courierId, ACTIVE_WORKLOAD_STATUSES);
    }

    private void refreshCourierAvailabilityStatus(CourierProfileEntity courier) {
        if (courier.getAvailabilityStatus() == CourierAvailabilityStatus.OFFLINE
                || courier.getAvailabilityStatus() == CourierAvailabilityStatus.ON_BREAK) {
            return;
        }
        long activeCount = countActiveWorkload(courier.getId());
        courier.setAvailabilityStatus(activeCount > 0
                ? CourierAvailabilityStatus.BUSY
                : CourierAvailabilityStatus.AVAILABLE);
        courier.setLastActiveAt(LocalDateTime.now());
        courierRepository.save(courier);
    }

    // =========================================================================
    // 7. ENTITY RESOLUTION & BUILDER HELPERS
    // =========================================================================

    private CourierProfileEntity resolveCourier(String courierIdOrCode) {
        if (courierIdOrCode == null || courierIdOrCode.isBlank()) {
            throw new IllegalArgumentException("Courier identifier is required");
        }
        String trimmed = courierIdOrCode.trim();
        try {
            Long numId = Long.parseLong(trimmed);
            Optional<CourierProfileEntity> byId = courierRepository.findById(numId);
            if (byId.isPresent()) {
                return byId.get();
            }
        } catch (NumberFormatException ignored) {
        }

        return courierRepository.findByCourierCodeIgnoreCase(trimmed)
                .or(() -> courierRepository.findByUserId(trimmed))
                .orElseThrow(() -> new ResourceNotFoundException("Courier not found: " + trimmed));
    }

    private CourierProfileEntity resolveOrProvisionCurrentCourier(DispatchUserPrincipal principal) {
        if (principal.userId() != null) {
            Optional<CourierProfileEntity> byUser = courierRepository.findByUserId(principal.userId())
                    .or(() -> courierRepository.findByCourierCodeIgnoreCase(principal.userId()));
            if (byUser.isPresent()) {
                return byUser.get();
            }
        }
        if (principal.email() != null) {
            Optional<CourierProfileEntity> byEmail = courierRepository.findByEmailIgnoreCase(principal.email());
            if (byEmail.isPresent()) {
                return byEmail.get();
            }
        }

        // Provision operational courier profile for authenticated COURIER user
        CourierProfileEntity created = new CourierProfileEntity();
        String code = generateUniqueCode("CR-", courierRepository::existsByCourierCodeIgnoreCase);
        created.setCourierCode(code);
        created.setUserId(principal.userId());
        created.setName(principal.email() != null ? principal.email().split("@")[0] : "SwiftDrop Courier");
        created.setPhone("+94 77 000 0000");
        created.setEmail(principal.email() != null ? principal.email() : code.toLowerCase() + "@swiftdrop.lk");
        created.setVehicleType(VehicleType.MOTORCYCLE);
        created.setVehiclePlate("WP BDF-" + (1000 + random.nextInt(9000)));
        created.setBranchId(principal.branchId() != null ? principal.branchId() : 1L);
        created.setBranchCode("CMB-CENTRAL");
        created.setBranchName("Colombo Central Hub");
        created.setZone("Zone A - Colombo Central");
        created.setAvailabilityStatus(CourierAvailabilityStatus.AVAILABLE);
        created.setMaxCapacity(8);
        return courierRepository.save(created);
    }

    private CourierAssignment resolveAssignment(String idOrCode) {
        if (idOrCode == null || idOrCode.isBlank()) {
            throw new IllegalArgumentException("Assignment ID is required");
        }
        String trimmed = idOrCode.trim();
        try {
            Long numId = Long.parseLong(trimmed);
            Optional<CourierAssignment> byId = assignmentRepository.findById(numId);
            if (byId.isPresent()) {
                return byId.get();
            }
        } catch (NumberFormatException ignored) {
        }
        return assignmentRepository.findByAssignmentCodeIgnoreCase(trimmed)
                .orElseThrow(() -> new ResourceNotFoundException("Courier assignment not found: " + trimmed));
    }

    private CourierAssignment resolveDeliveryAssignment(String assignmentOrJobId) {
        String trimmed = assignmentOrJobId.trim();
        try {
            Long numId = Long.parseLong(trimmed);
            Optional<CourierAssignment> byId = assignmentRepository.findById(numId);
            if (byId.isPresent()) {
                return byId.get();
            }
            List<CourierAssignment> byJobId = assignmentRepository.findByDeliveryJobIdOrderByAssignedAtDesc(numId);
            if (!byJobId.isEmpty()) {
                return byJobId.get(0);
            }
        } catch (NumberFormatException ignored) {
        }

        Optional<CourierAssignment> byCode = assignmentRepository.findByAssignmentCodeIgnoreCase(trimmed);
        if (byCode.isPresent()) {
            return byCode.get();
        }

        Optional<DeliveryJob> byJobCode = deliveryJobRepository.findByJobCodeIgnoreCase(trimmed)
                .or(() -> deliveryJobRepository.findByOrderId(trimmed))
                .or(() -> deliveryJobRepository.findByTrackingNumberIgnoreCase(trimmed));
        if (byJobCode.isPresent()) {
            List<CourierAssignment> list = assignmentRepository.findByDeliveryJobIdOrderByAssignedAtDesc(byJobCode.get().getId());
            if (!list.isEmpty()) {
                return list.get(0);
            }
        }
        throw new ResourceNotFoundException("Delivery assignment not found: " + trimmed);
    }

    private DeliveryException resolveExceptionEntity(String idOrCode) {
        String trimmed = idOrCode.trim();
        try {
            Long numId = Long.parseLong(trimmed);
            Optional<DeliveryException> byId = exceptionRepository.findById(numId);
            if (byId.isPresent()) {
                return byId.get();
            }
        } catch (NumberFormatException ignored) {
        }
        return exceptionRepository.findByExceptionCodeIgnoreCase(trimmed)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery exception not found: " + trimmed));
    }

    private AssignmentTaskType resolveRequestedTaskType(AssignCourierRequest request) {
        if (request.getTaskType() != null && !request.getTaskType().isBlank()) {
            return AssignmentTaskType.fromValue(request.getTaskType());
        }
        if (request.getPickupTaskId() != null) {
            return AssignmentTaskType.PICKUP;
        }
        return AssignmentTaskType.DELIVERY;
    }

    private PickupTask resolveOrCreatePickupTaskForAssignment(AssignCourierRequest request) {
        if (request.getPickupTaskId() != null) {
            return pickupTaskRepository.findById(request.getPickupTaskId())
                    .orElseThrow(() -> new ResourceNotFoundException("Pickup task not found: " + request.getPickupTaskId()));
        }
        if (request.getOrderId() != null && !request.getOrderId().isBlank()) {
            String key = request.getOrderId().trim();
            Optional<PickupTask> existing = pickupTaskRepository.findByOrderId(key)
                    .or(() -> pickupTaskRepository.findByTrackingNumberIgnoreCase(key))
                    .or(() -> pickupTaskRepository.findByTaskCodeIgnoreCase(key));
            if (existing.isPresent()) {
                return existing.get();
            }
            OrderSummaryDto orderInfo = orderServiceClient.getOrderByIdOrTracking(key);
            PickupMethod method = PickupMethod.fromValue(orderInfo.getPickupMethod());
            if (method == PickupMethod.BRANCH_DROPOFF) {
                throw new DispatchValidationException(
                        "BRANCH_DROPOFF_NO_PICKUP_TASK",
                        "Branch drop-off orders do not require a courier pickup task"
                );
            }
            PickupTask created = buildPickupTaskFromOrder(orderInfo, method, request.getPriority());
            return pickupTaskRepository.save(created);
        }
        throw new IllegalArgumentException("Either pickupTaskId or orderId is required to assign a pickup courier");
    }

    private DeliveryJob resolveOrCreateDeliveryJobForAssignment(AssignCourierRequest request) {
        if (request.getDeliveryJobId() != null) {
            return deliveryJobRepository.findById(request.getDeliveryJobId())
                    .orElseThrow(() -> new ResourceNotFoundException("Delivery job not found: " + request.getDeliveryJobId()));
        }
        if (request.getOrderId() != null && !request.getOrderId().isBlank()) {
            String key = request.getOrderId().trim();
            Optional<DeliveryJob> existing = deliveryJobRepository.findByOrderId(key)
                    .or(() -> deliveryJobRepository.findByTrackingNumberIgnoreCase(key))
                    .or(() -> deliveryJobRepository.findByJobCodeIgnoreCase(key));
            if (existing.isPresent()) {
                return existing.get();
            }
            OrderSummaryDto orderInfo = orderServiceClient.getOrderByIdOrTracking(key);
            DeliveryJob created = buildDeliveryJobFromOrder(orderInfo, request.getPriority(), null);
            return deliveryJobRepository.save(created);
        }
        throw new IllegalArgumentException("Either deliveryJobId or orderId is required to assign a delivery courier");
    }

    private OrderSummaryDto resolveOrderSummary(CreateOperationalTaskRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Task creation request is required");
        }
        boolean hasInlineFields = req.getTrackingNumber() != null && !req.getTrackingNumber().isBlank()
                && req.getPickupAddress() != null && !req.getPickupAddress().isBlank()
                && req.getDeliveryAddress() != null && !req.getDeliveryAddress().isBlank();

        if (!hasInlineFields) {
            String lookup = (req.getOrderId() != null && !req.getOrderId().isBlank())
                    ? req.getOrderId().trim()
                    : (req.getTrackingNumber() != null ? req.getTrackingNumber().trim() : null);
            if (lookup == null || lookup.isBlank()) {
                throw new IllegalArgumentException("Either orderId or trackingNumber is required");
            }
            return orderServiceClient.getOrderByIdOrTracking(lookup);
        }

        OrderSummaryDto dto = new OrderSummaryDto();
        dto.setOrderId(req.getOrderId() != null ? req.getOrderId().trim() : req.getTrackingNumber().trim());
        dto.setTrackingNumber(req.getTrackingNumber().trim());
        dto.setPickupMethod(req.getPickupMethod() != null ? req.getPickupMethod() : "COURIER_PICKUP");
        dto.setOriginBranchId(req.getOriginBranchId() != null ? req.getOriginBranchId() : 1L);
        dto.setOriginBranchCode(req.getOriginBranchCode() != null ? req.getOriginBranchCode() : "CMB-CENTRAL");
        dto.setOriginBranchName(req.getOriginBranchName() != null ? req.getOriginBranchName() : "Colombo Central Hub");
        dto.setDestinationBranchId(req.getDestinationBranchId() != null ? req.getDestinationBranchId() : dto.getOriginBranchId());
        dto.setDestinationBranchCode(req.getDestinationBranchCode() != null ? req.getDestinationBranchCode() : dto.getOriginBranchCode());
        dto.setDestinationBranchName(req.getDestinationBranchName() != null ? req.getDestinationBranchName() : dto.getOriginBranchName());
        dto.setSameBranch(req.getSameBranch() != null
                ? req.getSameBranch()
                : Objects.equals(dto.getOriginBranchId(), dto.getDestinationBranchId()));
        dto.setMerchantBusinessName(req.getMerchantName());
        dto.setPickupAddress(req.getPickupAddress());
        dto.setPickupCity(req.getPickupCity() != null ? req.getPickupCity() : "Colombo");
        dto.setPickupContactName(req.getSenderName() != null ? req.getSenderName() : "SwiftDrop Sender");
        dto.setPickupContactPhone(req.getSenderPhone() != null ? req.getSenderPhone() : "+94 77 000 0000");
        dto.setDropoffAddress(req.getDeliveryAddress());
        dto.setDropoffCity(req.getDeliveryCity() != null ? req.getDeliveryCity() : "Colombo");
        dto.setDropoffContactName(req.getRecipientName() != null ? req.getRecipientName() : "SwiftDrop Recipient");
        dto.setDropoffContactPhone(req.getRecipientPhone() != null ? req.getRecipientPhone() : "+94 77 111 1111");
        dto.setParcelDescription(req.getParcelCategory() != null ? req.getParcelCategory() : "Standard Parcel");
        dto.setParcelSize(req.getParcelSize() != null ? req.getParcelSize() : "MEDIUM");
        dto.setWeightKg(req.getWeightKg() != null ? req.getWeightKg() : BigDecimal.ONE);
        dto.setFragile(Boolean.TRUE.equals(req.getFragile()));
        dto.setDeliveryInstructions(req.getHandlingNotes());
        dto.setDistanceKm(req.getDistanceKm() != null ? req.getDistanceKm() : new BigDecimal("5.00"));
        dto.setDeliveryFee(req.getDeliveryFee() != null ? req.getDeliveryFee() : new BigDecimal("650.00"));
        dto.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "PREPAID");
        dto.setCodAmount(req.getCodAmount() != null ? req.getCodAmount() : BigDecimal.ZERO);
        return dto;
    }

    private OrderSummaryDto resolveOrderSummaryForDropoff(String lookupKey, BranchDropoffConfirmRequest req) {
        try {
            return orderServiceClient.getOrderByIdOrTracking(lookupKey);
        } catch (ResourceNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            // Fallback if inline tracking number and branch were provided in test/offline mode
            if (req.getTrackingNumber() != null && !req.getTrackingNumber().isBlank()) {
                OrderSummaryDto dto = new OrderSummaryDto();
                dto.setOrderId(req.getOrderId() != null ? req.getOrderId() : req.getTrackingNumber());
                dto.setTrackingNumber(req.getTrackingNumber());
                dto.setPickupMethod("BRANCH_DROPOFF");
                dto.setOriginBranchId(req.getBranchId() != null ? req.getBranchId() : 1L);
                dto.setOriginBranchCode(req.getBranchCode() != null ? req.getBranchCode() : "CMB-CENTRAL");
                dto.setOriginBranchName(req.getBranchName() != null ? req.getBranchName() : "Colombo Central Hub");
                dto.setDestinationBranchId(dto.getOriginBranchId());
                dto.setDestinationBranchCode(dto.getOriginBranchCode());
                dto.setDestinationBranchName(dto.getOriginBranchName());
                dto.setSameBranch(true);
                dto.setPickupAddress("Branch Counter Drop-Off");
                dto.setPickupCity("Colombo");
                dto.setPickupContactName("Walk-in Sender");
                dto.setPickupContactPhone("+94 77 000 0000");
                dto.setDropoffAddress("Colombo Recipient Address");
                dto.setDropoffCity("Colombo");
                dto.setDropoffContactName("Recipient");
                dto.setDropoffContactPhone("+94 77 111 1111");
                dto.setParcelDescription("Standard Parcel");
                dto.setParcelSize("MEDIUM");
                dto.setWeightKg(BigDecimal.ONE);
                dto.setDistanceKm(new BigDecimal("4.50"));
                dto.setDeliveryFee(new BigDecimal("550.00"));
                return dto;
            }
            throw ex;
        }
    }

    private PickupTask buildPickupTaskFromOrder(OrderSummaryDto order, PickupMethod method, String priorityRaw) {
        PickupTask task = new PickupTask();
        task.setTaskCode("PKP-" + (10000 + random.nextInt(90000)));
        task.setOrderId(order.resolvedOrderId());
        task.setTrackingNumber(order.getTrackingNumber() != null ? order.getTrackingNumber() : "SD-" + (10000 + random.nextInt(90000)));
        task.setPickupMethod(method);
        task.setStatus(PickupTaskStatus.PENDING_ASSIGNMENT);
        task.setPriority(DeliveryPriority.fromValue(priorityRaw));
        task.setOriginBranchId(order.getOriginBranchId() != null ? order.getOriginBranchId() : 1L);
        task.setOriginBranchCode(order.getOriginBranchCode() != null ? order.getOriginBranchCode() : "CMB-CENTRAL");
        task.setOriginBranchName(order.getOriginBranchName() != null ? order.getOriginBranchName() : "Colombo Central Hub");
        task.setDestinationBranchId(order.getDestinationBranchId() != null ? order.getDestinationBranchId() : task.getOriginBranchId());
        task.setDestinationBranchCode(order.getDestinationBranchCode() != null ? order.getDestinationBranchCode() : task.getOriginBranchCode());
        task.setDestinationBranchName(order.getDestinationBranchName() != null ? order.getDestinationBranchName() : task.getOriginBranchName());
        task.setSameBranch(order.getSameBranch() != null
                ? order.getSameBranch()
                : Objects.equals(task.getOriginBranchId(), task.getDestinationBranchId()));
        task.setMerchantName(order.getMerchantBusinessName() != null ? order.getMerchantBusinessName() : order.getPickupContactName());
        task.setSenderName(order.getPickupContactName() != null ? order.getPickupContactName() : "Sender");
        task.setSenderPhone(order.getPickupContactPhone() != null ? order.getPickupContactPhone() : "+94 77 000 0000");
        task.setPickupAddress(order.getPickupAddress() != null ? order.getPickupAddress() : "Colombo");
        task.setPickupCity(order.getPickupCity() != null ? order.getPickupCity() : "Colombo");
        task.setRecipientName(order.getDropoffContactName() != null ? order.getDropoffContactName() : "Recipient");
        task.setRecipientPhone(order.getDropoffContactPhone() != null ? order.getDropoffContactPhone() : "+94 77 111 1111");
        task.setDropoffAddress(order.getDropoffAddress() != null ? order.getDropoffAddress() : "Colombo");
        task.setDropoffCity(order.getDropoffCity() != null ? order.getDropoffCity() : "Colombo");
        task.setParcelCategory(order.getParcelDescription() != null ? order.getParcelDescription() : "Standard Parcel");
        task.setParcelSize(order.getParcelSize() != null ? order.getParcelSize() : "MEDIUM");
        task.setWeightKg(order.getWeightKg() != null ? order.getWeightKg() : BigDecimal.ONE);
        task.setFragile(Boolean.TRUE.equals(order.getFragile()));
        task.setHandlingNotes(order.getDeliveryInstructions());
        task.setDistanceKm(order.getDistanceKm() != null ? order.getDistanceKm() : new BigDecimal("5.00"));
        task.setDeliveryFee(order.getDeliveryFee() != null ? order.getDeliveryFee() : new BigDecimal("650.00"));
        task.setPaymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod() : "PREPAID");
        task.setCodAmount(order.getCodAmount() != null ? order.getCodAmount() : BigDecimal.ZERO);
        return task;
    }

    private DeliveryJob buildDeliveryJobFromOrder(OrderSummaryDto order, String priorityRaw, String dimensions) {
        DeliveryJob job = new DeliveryJob();
        job.setJobCode("DLV-" + (10000 + random.nextInt(90000)));
        job.setOrderId(order.resolvedOrderId());
        job.setTrackingNumber(order.getTrackingNumber() != null ? order.getTrackingNumber() : "SD-" + (10000 + random.nextInt(90000)));
        job.setStatus(DeliveryJobStatus.UNASSIGNED);
        job.setPriority(DeliveryPriority.fromValue(priorityRaw));

        Long destBranchId = order.getDestinationBranchId() != null
                ? order.getDestinationBranchId()
                : (order.getOriginBranchId() != null ? order.getOriginBranchId() : 1L);
        String destBranchCode = order.getDestinationBranchCode() != null
                ? order.getDestinationBranchCode()
                : (order.getOriginBranchCode() != null ? order.getOriginBranchCode() : "CMB-CENTRAL");
        String destBranchName = order.getDestinationBranchName() != null
                ? order.getDestinationBranchName()
                : (order.getOriginBranchName() != null ? order.getOriginBranchName() : "Colombo Central Hub");

        job.setBranchId(destBranchId);
        job.setBranchCode(destBranchCode);
        job.setBranchName(destBranchName);
        job.setOriginBranchId(order.getOriginBranchId() != null ? order.getOriginBranchId() : destBranchId);
        job.setOriginBranchCode(order.getOriginBranchCode() != null ? order.getOriginBranchCode() : destBranchCode);
        job.setOriginBranchName(order.getOriginBranchName() != null ? order.getOriginBranchName() : destBranchName);
        job.setDestinationBranchId(destBranchId);
        job.setDestinationBranchCode(destBranchCode);
        job.setDestinationBranchName(destBranchName);

        job.setMerchantName(order.getMerchantBusinessName() != null
                ? order.getMerchantBusinessName()
                : (order.getPickupContactName() != null ? order.getPickupContactName() : "SwiftDrop Customer"));
        job.setMerchantContact(order.getPickupContactPhone());
        job.setSenderName(order.getPickupContactName() != null ? order.getPickupContactName() : "Sender");
        job.setSenderPhone(order.getPickupContactPhone() != null ? order.getPickupContactPhone() : "+94 77 000 0000");
        job.setPickupAddress(order.getPickupAddress() != null ? order.getPickupAddress() : destBranchName);
        job.setPickupCity(order.getPickupCity() != null ? order.getPickupCity() : "Colombo");
        job.setRecipientName(order.getDropoffContactName() != null ? order.getDropoffContactName() : "Recipient");
        job.setRecipientPhone(order.getDropoffContactPhone() != null ? order.getDropoffContactPhone() : "+94 77 111 1111");
        job.setDeliveryAddress(order.getDropoffAddress() != null ? order.getDropoffAddress() : "Colombo");
        job.setDeliveryCity(order.getDropoffCity() != null ? order.getDropoffCity() : "Colombo");
        job.setParcelCategory(order.getParcelDescription() != null ? order.getParcelDescription() : "Standard Parcel");
        job.setParcelSize(order.getParcelSize() != null ? order.getParcelSize() : "MEDIUM");
        job.setWeightKg(order.getWeightKg() != null ? order.getWeightKg() : BigDecimal.ONE);
        job.setDimensions(dimensions != null ? dimensions : "30x20x15 cm");
        job.setHandlingNotes(order.getDeliveryInstructions());
        job.setDistanceKm(order.getDistanceKm() != null ? order.getDistanceKm() : new BigDecimal("5.00"));
        BigDecimal fee = order.getDeliveryFee() != null ? order.getDeliveryFee() : new BigDecimal("650.00");
        job.setPayoutLkr(fee.multiply(new BigDecimal("0.65")).setScale(2, RoundingMode.HALF_UP));
        job.setPaymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod() : "PREPAID");
        job.setCodAmount(order.getCodAmount() != null ? order.getCodAmount() : BigDecimal.ZERO);
        job.setAttemptCount(0);
        job.setMaxAttempts(DEFAULT_MAX_DELIVERY_ATTEMPTS);
        return job;
    }

    private DeliveryJob buildDeliveryJobFromPickupTask(PickupTask task) {
        DeliveryJob job = new DeliveryJob();
        job.setJobCode("DLV-" + (10000 + random.nextInt(90000)));
        job.setOrderId(task.getOrderId());
        job.setTrackingNumber(task.getTrackingNumber());
        job.setStatus(DeliveryJobStatus.UNASSIGNED);
        job.setPriority(task.getPriority());
        job.setBranchId(task.getDestinationBranchId());
        job.setBranchCode(task.getDestinationBranchCode());
        job.setBranchName(task.getDestinationBranchName());
        job.setOriginBranchId(task.getOriginBranchId());
        job.setOriginBranchCode(task.getOriginBranchCode());
        job.setOriginBranchName(task.getOriginBranchName());
        job.setDestinationBranchId(task.getDestinationBranchId());
        job.setDestinationBranchCode(task.getDestinationBranchCode());
        job.setDestinationBranchName(task.getDestinationBranchName());
        job.setMerchantName(task.getMerchantName());
        job.setMerchantContact(task.getSenderPhone());
        job.setSenderName(task.getSenderName());
        job.setSenderPhone(task.getSenderPhone());
        job.setPickupAddress(task.getPickupAddress());
        job.setPickupCity(task.getPickupCity());
        job.setRecipientName(task.getRecipientName());
        job.setRecipientPhone(task.getRecipientPhone());
        job.setDeliveryAddress(task.getDropoffAddress());
        job.setDeliveryCity(task.getDropoffCity());
        job.setParcelCategory(task.getParcelCategory());
        job.setParcelSize(task.getParcelSize());
        job.setWeightKg(task.getWeightKg());
        job.setDimensions("30x20x15 cm");
        job.setHandlingNotes(task.getHandlingNotes());
        job.setDistanceKm(task.getDistanceKm());
        job.setPayoutLkr(task.getDeliveryFee().multiply(new BigDecimal("0.65")).setScale(2, RoundingMode.HALF_UP));
        job.setPaymentMethod(task.getPaymentMethod());
        job.setCodAmount(task.getCodAmount());
        job.setAttemptCount(0);
        job.setMaxAttempts(DEFAULT_MAX_DELIVERY_ATTEMPTS);
        return job;
    }

    private String generateUniqueCode(String prefix, java.util.function.Predicate<String> existsCheck) {
        for (int i = 0; i < 15; i++) {
            int num = 1000 + random.nextInt(9000);
            String candidate = prefix + num;
            if (!existsCheck.test(candidate)) {
                return candidate;
            }
        }
        return prefix + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    // =========================================================================
    // 8. DTO MAPPERS
    // =========================================================================

    private CourierProfileDto toCourierProfileDto(
            CourierProfileEntity c,
            Long eligibilityBranchId,
            BigDecimal requiredWeightKg) {

        long activeCount = countActiveWorkload(c.getId());
        List<CourierAssignment> recentAssignments = assignmentRepository.findByCourierIdOrderByAssignedAtDesc(c.getId());

        CourierProfileDto dto = new CourierProfileDto();
        dto.setId(c.getCourierCode());
        dto.setNumericId(c.getId());
        dto.setCourierCode(c.getCourierCode());
        dto.setUserId(c.getUserId());
        dto.setName(c.getName());
        dto.setPhone(c.getPhone());
        dto.setEmail(c.getEmail());

        CourierAvailabilityStatus effectiveStatus = c.getAvailabilityStatus();
        if (effectiveStatus != CourierAvailabilityStatus.OFFLINE
                && effectiveStatus != CourierAvailabilityStatus.ON_BREAK) {
            effectiveStatus = activeCount > 0
                    ? CourierAvailabilityStatus.BUSY
                    : CourierAvailabilityStatus.AVAILABLE;
        }
        dto.setStatus(effectiveStatus.name());
        dto.setVehicleType(c.getVehicleType().getDisplayName());
        dto.setVehiclePlate(c.getVehiclePlate());
        dto.setBranchId(c.getBranchId());
        dto.setBranchCode(c.getBranchCode());
        dto.setBranchName(c.getBranchName());
        dto.setZone(c.getZone());
        dto.setActiveDeliveries((int) activeCount);
        dto.setMaxCapacity(c.getMaxCapacity());
        dto.setCompletedToday(c.getCompletedToday());
        dto.setTotalCompletedLifetime(c.getTotalCompletedLifetime());
        dto.setRating(c.getRating());
        dto.setShiftStart(c.getShiftStart());
        dto.setLastActive(c.getLastActiveAt() != null ? c.getLastActiveAt().toString() : "Just now");

        boolean eligible = true;
        String reason = null;
        if (eligibilityBranchId != null && !eligibilityBranchId.equals(c.getBranchId())) {
            eligible = false;
            reason = "Assigned to " + c.getBranchName();
        } else if (c.getAvailabilityStatus() == CourierAvailabilityStatus.OFFLINE
                || c.getAvailabilityStatus() == CourierAvailabilityStatus.ON_BREAK) {
            eligible = false;
            reason = "Courier is currently " + c.getAvailabilityStatus();
        } else if (activeCount >= c.getMaxCapacity()) {
            eligible = false;
            reason = "At maximum capacity (" + activeCount + "/" + c.getMaxCapacity() + ")";
        } else if (requiredWeightKg != null && requiredWeightKg.compareTo(maxWeightForVehicle(c.getVehicleType())) > 0) {
            eligible = false;
            reason = "Parcel weight exceeds " + c.getVehicleType().getDisplayName() + " capacity";
        }
        dto.setIsEligible(eligible);
        dto.setIneligibilityReason(reason);

        List<CourierProfileDto.AssignedOrderItemDto> assignedOrders = recentAssignments.stream()
                .limit(5)
                .map(a -> new CourierProfileDto.AssignedOrderItemDto(
                        a.getOrderId(),
                        a.getTrackingNumber(),
                        resolveAssignmentDestination(a),
                        a.getPriority().name(),
                        formatAssignmentStatusLabel(a.getStatus()),
                        a.getAssignedAt() != null ? a.getAssignedAt().toString() : ""
                ))
                .toList();
        dto.setAssignedOrders(assignedOrders);
        return dto;
    }

    private String resolveAssignmentDestination(CourierAssignment a) {
        if (a.getDeliveryJob() != null) {
            return a.getDeliveryJob().getDeliveryAddress();
        }
        if (a.getPickupTask() != null) {
            return a.getPickupTask().getPickupAddress();
        }
        return a.getBranchName();
    }

    private String formatAssignmentStatusLabel(AssignmentStatus status) {
        if (status == null) return "Assigned";
        return switch (status) {
            case IN_TRANSIT -> "In Transit";
            case DELIVERED -> "Delivered";
            default -> "Assigned";
        };
    }

    private PickupTaskDto toPickupTaskDto(PickupTask t) {
        PickupTaskDto dto = new PickupTaskDto();
        dto.setId(t.getId());
        dto.setTaskCode(t.getTaskCode());
        dto.setOrderId(t.getOrderId());
        dto.setTrackingNumber(t.getTrackingNumber());
        dto.setPickupMethod(t.getPickupMethod().name());
        dto.setStatus(t.getStatus().name());
        dto.setPriority(t.getPriority().name());
        dto.setOriginBranchId(t.getOriginBranchId());
        dto.setOriginBranchCode(t.getOriginBranchCode());
        dto.setOriginBranchName(t.getOriginBranchName());
        dto.setDestinationBranchId(t.getDestinationBranchId());
        dto.setDestinationBranchCode(t.getDestinationBranchCode());
        dto.setDestinationBranchName(t.getDestinationBranchName());
        dto.setSameBranch(t.isSameBranch());
        dto.setMerchantName(t.getMerchantName());
        dto.setSenderName(t.getSenderName());
        dto.setSenderPhone(t.getSenderPhone());
        dto.setPickupAddress(t.getPickupAddress());
        dto.setPickupCity(t.getPickupCity());
        dto.setRecipientName(t.getRecipientName());
        dto.setRecipientPhone(t.getRecipientPhone());
        dto.setDropoffAddress(t.getDropoffAddress());
        dto.setDropoffCity(t.getDropoffCity());
        dto.setParcelCategory(t.getParcelCategory());
        dto.setParcelSize(t.getParcelSize());
        dto.setWeightKg(t.getWeightKg());
        dto.setFragile(t.isFragile());
        dto.setHandlingNotes(t.getHandlingNotes());
        dto.setDistanceKm(t.getDistanceKm());
        dto.setDeliveryFee(t.getDeliveryFee());
        dto.setPaymentMethod(t.getPaymentMethod());
        dto.setCodAmount(t.getCodAmount());
        dto.setAssignedCourierId(t.getAssignedCourierId());
        dto.setAssignedCourierCode(t.getAssignedCourierCode());
        dto.setAssignedCourierName(t.getAssignedCourierName());
        dto.setParcelReference(t.getParcelReference());
        dto.setBranchConfirmedByEmployeeId(t.getBranchConfirmedByEmployeeId());
        dto.setBranchConfirmedByEmployeeName(t.getBranchConfirmedByEmployeeName());
        dto.setBranchConfirmedAt(t.getBranchConfirmedAt() != null ? t.getBranchConfirmedAt().toString() : null);
        dto.setPickedUpAt(t.getPickedUpAt() != null ? t.getPickedUpAt().toString() : null);
        dto.setCompletedAt(t.getCompletedAt() != null ? t.getCompletedAt().toString() : null);
        dto.setCreatedAt(t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
        return dto;
    }

    private DeliveryJobDto toDeliveryJobDto(DeliveryJob j, CourierAssignment assignment) {
        DeliveryJobDto dto = new DeliveryJobDto();
        dto.setId(j.getId());
        dto.setJobCode(j.getJobCode());
        dto.setAssignmentId(assignment != null ? assignment.getAssignmentCode() : j.getJobCode());
        dto.setOrderId(j.getOrderId());
        dto.setTrackingNumber(j.getTrackingNumber());
        dto.setStatus(j.getStatus().name());
        dto.setPriority(j.getPriority().name());
        dto.setBranchId(j.getBranchId());
        dto.setBranchCode(j.getBranchCode());
        dto.setBranchName(j.getBranchName());
        dto.setMerchantName(j.getMerchantName() != null ? j.getMerchantName() : j.getSenderName());
        dto.setMerchantContact(j.getMerchantContact() != null ? j.getMerchantContact() : j.getSenderPhone());
        dto.setPickupAddress(j.getPickupAddress());
        dto.setRecipientName(j.getRecipientName());
        dto.setRecipientPhone(j.getRecipientPhone());
        dto.setDeliveryAddress(j.getDeliveryAddress());
        dto.setCity(j.getDeliveryCity() != null ? j.getDeliveryCity() : "Colombo");
        dto.setOrderDate(j.getCreatedAt() != null ? j.getCreatedAt().toString() : LocalDateTime.now().toString());
        dto.setParcelInfo(new DeliveryJobDto.ParcelInfoDto(
                j.getWeightKg(),
                j.getParcelCategory(),
                j.getDimensions() != null ? j.getDimensions() : "30x20x15 cm",
                j.getHandlingNotes()
        ));
        dto.setRecipient(new DeliveryJobDto.RecipientDto(
                j.getRecipientName(),
                j.getRecipientPhone(),
                j.getDeliveryAddress(),
                j.getDeliveryCity() != null ? j.getDeliveryCity() : "Colombo"
        ));
        dto.setParcel(new DeliveryJobDto.ParcelDto(
                j.getParcelCategory(),
                j.getWeightKg(),
                j.getHandlingNotes()
        ));
        dto.setDistanceKm(j.getDistanceKm());
        dto.setPayoutLkr(j.getPayoutLkr());
        dto.setPaymentMethod(j.getPaymentMethod());
        dto.setCodAmount(j.getCodAmount());
        dto.setAttemptCount(j.getAttemptCount());
        dto.setMaxAttempts(j.getMaxAttempts());
        dto.setAssignedCourierId(j.getAssignedCourierId());
        dto.setAssignedCourierCode(j.getAssignedCourierCode());
        dto.setAssignedCourierName(j.getAssignedCourierName());
        dto.setAssignedAt(j.getAssignedAt() != null ? j.getAssignedAt().toString() : null);
        dto.setPickedUpAt(j.getPickedUpAt() != null ? j.getPickedUpAt().toString() : null);
        dto.setCompletedAt(j.getCompletedAt() != null ? j.getCompletedAt().toString() : null);

        if (j.getProofOfDelivery() != null) {
            ProofOfDelivery pod = j.getProofOfDelivery();
            DeliveryJobDto.ProofOfDeliverySummaryDto podDto = new DeliveryJobDto.ProofOfDeliverySummaryDto();
            podDto.setType(pod.getProofType().name());
            podDto.setReceivedBy(pod.getRecipientName());
            String primaryRef = pod.getSignatureReference() != null
                    ? pod.getSignatureReference()
                    : (pod.getPhotoEvidenceReference() != null ? pod.getPhotoEvidenceReference() : pod.getOtpReference());
            podDto.setReference(primaryRef);
            podDto.setSignatureReference(pod.getSignatureReference());
            podDto.setPhotoEvidenceReference(pod.getPhotoEvidenceReference());
            podDto.setParcelReference(pod.getParcelReference());
            podDto.setDeliveredAt(pod.getDeliveredAt() != null ? pod.getDeliveredAt().toString() : null);
            podDto.setCourierName(pod.getCourierName());
            dto.setProofOfDelivery(podDto);
        }

        List<DeliveryAttempt> attempts = j.getAttempts();
        if (attempts != null && !attempts.isEmpty()) {
            List<DeliveryJobDto.AttemptRecordDto> attemptDtos = attempts.stream().map(att -> {
                DeliveryJobDto.AttemptRecordDto ad = new DeliveryJobDto.AttemptRecordDto();
                ad.setId(att.getId());
                ad.setAttemptNumber(att.getAttemptNumber());
                ad.setOutcome(att.getOutcome().name());
                ad.setFailureReason(att.getFailureReason());
                ad.setNotes(att.getNotes());
                ad.setCourierName(att.getCourierName());
                ad.setAttemptedAt(att.getAttemptedAt() != null ? att.getAttemptedAt().toString() : null);
                return ad;
            }).toList();
            dto.setAttempts(attemptDtos);

            DeliveryAttempt lastAttempt = attempts.get(attempts.size() - 1);
            if (lastAttempt.getOutcome() == AttemptOutcome.FAILED) {
                dto.setFailure(new DeliveryJobDto.FailureSummaryDto(
                        lastAttempt.getFailureReason(),
                        lastAttempt.getNotes() != null ? lastAttempt.getNotes() : ""
                ));
            }
        }

        return dto;
    }

    private DeliveryJobDto toCourierJobDtoFromAssignment(CourierAssignment a) {
        if (a.getDeliveryJob() != null) {
            DeliveryJobDto dto = toDeliveryJobDto(a.getDeliveryJob(), a);
            String courierStatus = a.getStatus() == AssignmentStatus.REASSIGNED
                    ? AssignmentStatus.ASSIGNED.name()
                    : a.getStatus().name();
            dto.setStatus(courierStatus);
            dto.setAssignmentId(a.getAssignmentCode());
            dto.setAssignedAt(a.getAssignedAt() != null ? a.getAssignedAt().toString() : dto.getAssignedAt());
            dto.setPickedUpAt(a.getPickedUpAt() != null ? a.getPickedUpAt().toString() : dto.getPickedUpAt());
            dto.setCompletedAt(a.getCompletedAt() != null ? a.getCompletedAt().toString() : dto.getCompletedAt());
            dto.setAllowedActions(CourierLifecycle.allowedActions(a));
            return dto;
        }

        PickupTask pt = a.getPickupTask();
        DeliveryJobDto dto = new DeliveryJobDto();
        dto.setId(a.getId());
        dto.setJobCode(pt != null ? pt.getTaskCode() : a.getAssignmentCode());
        dto.setAssignmentId(a.getAssignmentCode());
        dto.setOrderId(a.getOrderId());
        dto.setTrackingNumber(a.getTrackingNumber());
        dto.setStatus(a.getStatus() == AssignmentStatus.REASSIGNED ? "ASSIGNED" : a.getStatus().name());
        dto.setPriority(a.getPriority().name());
        dto.setBranchId(a.getBranchId());
        dto.setBranchCode(a.getBranchCode());
        dto.setBranchName(a.getBranchName());
        if (pt != null) {
            dto.setMerchantName(pt.getMerchantName() != null ? pt.getMerchantName() : pt.getSenderName());
            dto.setPickupAddress(pt.getPickupAddress());
            dto.setRecipientName(pt.getRecipientName());
            dto.setRecipientPhone(pt.getRecipientPhone());
            dto.setDeliveryAddress(pt.getDropoffAddress());
            dto.setCity(pt.getDropoffCity() != null ? pt.getDropoffCity() : "Colombo");
            dto.setRecipient(new DeliveryJobDto.RecipientDto(
                    pt.getRecipientName(),
                    pt.getRecipientPhone(),
                    pt.getDropoffAddress(),
                    pt.getDropoffCity() != null ? pt.getDropoffCity() : "Colombo"
            ));
            dto.setParcel(new DeliveryJobDto.ParcelDto(
                    pt.getParcelCategory(),
                    pt.getWeightKg(),
                    pt.getHandlingNotes()
            ));
            dto.setDistanceKm(pt.getDistanceKm());
            dto.setPayoutLkr(pt.getDeliveryFee().multiply(new BigDecimal("0.40")).setScale(2, RoundingMode.HALF_UP));
        }
        dto.setAssignedAt(a.getAssignedAt() != null ? a.getAssignedAt().toString() : null);
        dto.setPickedUpAt(a.getPickedUpAt() != null ? a.getPickedUpAt().toString() : null);
        dto.setCompletedAt(a.getCompletedAt() != null ? a.getCompletedAt().toString() : null);
        dto.setAllowedActions(CourierLifecycle.allowedActions(a));
        return dto;
    }

    private AssignmentRecordDto toAssignmentRecordDto(CourierAssignment a) {
        AssignmentRecordDto dto = new AssignmentRecordDto();
        dto.setId(a.getId());
        dto.setAssignmentId(a.getAssignmentCode());
        dto.setAssignmentCode(a.getAssignmentCode());
        dto.setTaskType(a.getTaskType().name());
        dto.setPickupTaskId(a.getPickupTask() != null ? a.getPickupTask().getId() : null);
        dto.setDeliveryJobId(a.getDeliveryJob() != null ? a.getDeliveryJob().getId() : null);
        dto.setOrderId(a.getOrderId());
        dto.setTrackingNumber(a.getTrackingNumber());
        dto.setBranchId(a.getBranchId());
        dto.setBranchCode(a.getBranchCode());
        dto.setBranchName(a.getBranchName());

        CourierProfileEntity c = a.getCourier();
        dto.setCourierId(c.getCourierCode());
        dto.setCourier(new AssignmentRecordDto.CourierSummaryDto(
                c.getCourierCode(),
                c.getCourierCode(),
                c.getName(),
                c.getPhone(),
                c.getVehicleType().getDisplayName()
        ));

        if (a.getDeliveryJob() != null) {
            DeliveryJob j = a.getDeliveryJob();
            dto.setRecipient(new DeliveryJobDto.RecipientDto(
                    j.getRecipientName(),
                    j.getRecipientPhone(),
                    j.getDeliveryAddress(),
                    j.getDeliveryCity() != null ? j.getDeliveryCity() : "Colombo"
            ));
            dto.setMerchantName(j.getMerchantName() != null ? j.getMerchantName() : j.getSenderName());
            dto.setDeliveryAttempts(j.getAttemptCount());
        } else if (a.getPickupTask() != null) {
            PickupTask pt = a.getPickupTask();
            dto.setRecipient(new DeliveryJobDto.RecipientDto(
                    pt.getRecipientName(),
                    pt.getRecipientPhone(),
                    pt.getDropoffAddress(),
                    pt.getDropoffCity() != null ? pt.getDropoffCity() : "Colombo"
            ));
            dto.setMerchantName(pt.getMerchantName() != null ? pt.getMerchantName() : pt.getSenderName());
            dto.setDeliveryAttempts(0);
        }

        String assignedTime = a.getAssignedAt() != null ? a.getAssignedAt().toString() : LocalDateTime.now().toString();
        dto.setAssignedDate(assignedTime);
        dto.setAssignedAt(assignedTime);
        dto.setDeliveryStatus(a.getStatus().name());
        dto.setStatus(a.getStatus().name());
        dto.setPriority(a.getPriority().name());
        dto.setNotes(a.getNotes());

        List<AssignmentRecordDto.AssignmentHistoryEntryDto> historyDtos = a.getHistory().stream()
                .map(h -> new AssignmentRecordDto.AssignmentHistoryEntryDto(
                        "hist-" + h.getId(),
                        h.getRecordedAt() != null ? h.getRecordedAt().toString() : assignedTime,
                        h.getFromCourierName(),
                        h.getToCourierName(),
                        h.getReason(),
                        h.getAssignedBy()
                ))
                .toList();
        dto.setHistory(historyDtos);
        return dto;
    }

    private DeliveryExceptionDto toDeliveryExceptionDto(DeliveryException ex) {
        DeliveryExceptionDto dto = new DeliveryExceptionDto();
        dto.setId(ex.getId());
        dto.setExceptionCode(ex.getExceptionCode());
        if (ex.getDeliveryJob() != null) {
            dto.setDeliveryJobId(ex.getDeliveryJob().getId());
            dto.setJobCode(ex.getDeliveryJob().getJobCode());
            dto.setRecipientName(ex.getDeliveryJob().getRecipientName());
            dto.setRecipientPhone(ex.getDeliveryJob().getRecipientPhone());
            dto.setDeliveryAddress(ex.getDeliveryJob().getDeliveryAddress());
        }
        dto.setOrderId(ex.getOrderId());
        dto.setTrackingNumber(ex.getTrackingNumber());
        dto.setBranchId(ex.getBranchId());
        dto.setBranchCode(ex.getBranchCode());
        dto.setBranchName(ex.getBranchName());
        dto.setTransferManifestId(ex.getTransferManifestId());
        dto.setManifestCode(ex.getManifestCode());
        dto.setPickupTaskId(ex.getPickupTaskId());
        dto.setReturnTaskId(ex.getReturnTaskId());
        dto.setParcelReference(ex.getParcelReference());
        dto.setDescription(ex.getDescription());
        dto.setResponsibleUserId(ex.getResponsibleUserId());
        dto.setResponsibleUserName(ex.getResponsibleUserName());
        dto.setResponsibleUserRole(ex.getResponsibleUserRole());
        dto.setEvidenceReference(ex.getEvidenceReference());
        dto.setReportedAt(ex.getReportedAt() != null ? ex.getReportedAt().toString() : null);
        dto.setResolutionNotes(ex.getResolutionNotes());
        dto.setExceptionType(ex.getExceptionType().name());
        dto.setStatus(ex.getStatus().name());
        dto.setFailedAttemptCount(ex.getFailedAttemptCount());
        dto.setLastFailureReason(ex.getLastFailureReason());
        dto.setDecisionAction(ex.getDecisionAction() != null ? ex.getDecisionAction().name() : null);
        dto.setDecisionReason(ex.getDecisionReason());
        dto.setDecidedById(ex.getDecidedById());
        dto.setDecidedByName(ex.getDecidedByName());
        dto.setDecidedByRole(ex.getDecidedByRole());
        dto.setDecidedAt(ex.getDecidedAt() != null ? ex.getDecidedAt().toString() : null);
        dto.setCreatedAt(ex.getCreatedAt() != null ? ex.getCreatedAt().toString() : null);
        return dto;
    }
}

