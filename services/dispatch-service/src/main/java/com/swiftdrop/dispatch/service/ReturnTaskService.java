package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderSummaryDto;
import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.*;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class ReturnTaskService {

    private final ReturnTaskRepository returnTaskRepository;
    private final DeliveryJobRepository deliveryJobRepository;
    private final PickupTaskRepository pickupTaskRepository;
    private final DeliveryExceptionRepository exceptionRepository;
    private final CourierAssignmentRepository assignmentRepository;
    private final CourierProfileRepository courierRepository;
    private final PodEvidenceStorageService evidenceStorageService;
    private final CustodyTrackingService custodyTrackingService;
    private final DispatchSupportService support;

    public ReturnTaskService(
            ReturnTaskRepository returnTaskRepository,
            DeliveryJobRepository deliveryJobRepository,
            PickupTaskRepository pickupTaskRepository,
            DeliveryExceptionRepository exceptionRepository,
            CourierAssignmentRepository assignmentRepository,
            CourierProfileRepository courierRepository,
            PodEvidenceStorageService evidenceStorageService,
            CustodyTrackingService custodyTrackingService,
            DispatchSupportService support) {
        this.returnTaskRepository = returnTaskRepository;
        this.deliveryJobRepository = deliveryJobRepository;
        this.pickupTaskRepository = pickupTaskRepository;
        this.exceptionRepository = exceptionRepository;
        this.assignmentRepository = assignmentRepository;
        this.courierRepository = courierRepository;
        this.evidenceStorageService = evidenceStorageService;
        this.custodyTrackingService = custodyTrackingService;
        this.support = support;
    }

    public ReturnTaskDto createReturnTask(CreateReturnTaskRequest request, DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);

        DeliveryJob job = request.getDeliveryJobId() != null
                ? deliveryJobRepository.findById(request.getDeliveryJobId())
                        .orElseThrow(() -> new ResourceNotFoundException("Delivery job", request.getDeliveryJobId()))
                : null;

        DeliveryException exception = request.getExceptionId() != null
                ? exceptionRepository.findById(request.getExceptionId())
                        .orElseThrow(() -> new ResourceNotFoundException("Delivery exception", request.getExceptionId()))
                : null;

        if (job == null && exception != null && exception.getDeliveryJob() != null) {
            job = exception.getDeliveryJob();
        }

        String candidateOrderId = support.firstNonBlank(
                request.getOrderId(),
                job != null ? job.getOrderId() : null,
                exception != null ? exception.getOrderId() : null
        );
        String candidateTracking = support.firstNonBlank(
                request.getTrackingNumber(),
                job != null ? job.getTrackingNumber() : null,
                exception != null ? exception.getTrackingNumber() : null
        );

        if (candidateOrderId == null && candidateTracking == null) {
            throw new DispatchValidationException(
                    "RETURN_ORDER_REQUIRED",
                    "orderId, trackingNumber, deliveryJobId, or exceptionId is required to initiate return-to-sender"
            );
        }

        PickupTask pickupTask = resolvePickupTask(candidateOrderId, candidateTracking);
        OrderSummaryDto orderSummary = support.fetchOrderQuietly(support.firstNonBlank(candidateOrderId, candidateTracking));
        if (job == null && candidateOrderId != null) {
            job = deliveryJobRepository.findByOrderId(candidateOrderId)
                    .or(() -> candidateTracking != null ? deliveryJobRepository.findByTrackingNumberIgnoreCase(candidateTracking) : Optional.empty())
                    .orElse(null);
        }

        String orderId = support.firstNonBlank(
                candidateOrderId,
                pickupTask != null ? pickupTask.getOrderId() : null,
                orderSummary != null ? orderSummary.resolvedOrderId() : null
        );
        String trackingNumber = support.firstNonBlank(
                candidateTracking,
                pickupTask != null ? pickupTask.getTrackingNumber() : null,
                orderSummary != null ? orderSummary.getTrackingNumber() : null,
                orderId
        );

        if (returnTaskRepository.existsByOrderIdAndStatusNot(orderId, ReturnTaskStatus.CANCELLED)) {
            throw new DispatchValidationException(
                    "RETURN_TASK_ALREADY_EXISTS",
                    "An active return-to-sender task already exists for order " + orderId
            );
        }

        return createReturnTaskInternal(
                orderId,
                trackingNumber,
                job,
                exception,
                pickupTask,
                orderSummary,
                request.getCurrentBranchId(),
                request.getCurrentBranchCode(),
                request.getCurrentBranchName(),
                request.getOriginBranchId(),
                request.getOriginBranchCode(),
                request.getOriginBranchName(),
                request.getReturnToName(),
                request.getReturnToPhone(),
                request.getReturnAddress(),
                request.getReason(),
                request.getNotes(),
                principal,
                true
        );
    }

    public ReturnTaskDto initiateFromException(
            DeliveryException exception,
            String reason,
            DispatchUserPrincipal principal,
            boolean notifyOrderService) {
        Optional<ReturnTask> existing = returnTaskRepository.findFirstByOrderIdOrderByCreatedAtDesc(exception.getOrderId())
                .filter(rt -> rt.getStatus() != ReturnTaskStatus.CANCELLED);
        if (existing.isPresent()) {
            ReturnTask found = existing.get();
            if (exception.getReturnTaskId() == null) {
                exception.setReturnTaskId(found.getId());
                exceptionRepository.save(exception);
            }
            return toReturnTaskDto(found);
        }

        DeliveryJob job = exception.getDeliveryJob();
        PickupTask pickupTask = resolvePickupTask(exception.getOrderId(), exception.getTrackingNumber());
        OrderSummaryDto orderSummary = support.fetchOrderQuietly(
                support.firstNonBlank(exception.getOrderId(), exception.getTrackingNumber())
        );

        return createReturnTaskInternal(
                exception.getOrderId(),
                exception.getTrackingNumber(),
                job,
                exception,
                pickupTask,
                orderSummary,
                exception.getBranchId(),
                exception.getBranchCode(),
                exception.getBranchName(),
                null,
                null,
                null,
                null,
                null,
                null,
                reason,
                exception.getDescription(),
                principal,
                notifyOrderService
        );
    }

    private ReturnTaskDto createReturnTaskInternal(
            String orderId,
            String trackingNumber,
            DeliveryJob job,
            DeliveryException exception,
            PickupTask pickupTask,
            OrderSummaryDto orderSummary,
            Long reqCurrentBranchId,
            String reqCurrentBranchCode,
            String reqCurrentBranchName,
            Long reqOriginBranchId,
            String reqOriginBranchCode,
            String reqOriginBranchName,
            String reqReturnToName,
            String reqReturnToPhone,
            String reqReturnAddress,
            String reason,
            String notes,
            DispatchUserPrincipal principal,
            boolean notifyOrderService) {

        Long currentBranchId = firstNonNullLong(
                reqCurrentBranchId,
                job != null ? job.getBranchId() : null,
                exception != null ? exception.getBranchId() : null,
                pickupTask != null ? pickupTask.getDestinationBranchId() : null,
                pickupTask != null ? pickupTask.getOriginBranchId() : null,
                orderSummary != null ? orderSummary.getDestinationBranchId() : null,
                orderSummary != null ? orderSummary.getOriginBranchId() : null,
                principal.branchId()
        );
        if (currentBranchId == null) {
            throw new DispatchValidationException("BRANCH_REQUIRED", "Current holding branch could not be resolved for return task");
        }
        support.enforceBranchAccess(principal, currentBranchId, "initiate return-to-sender");

        String currentBranchCode = support.firstNonBlank(
                reqCurrentBranchCode,
                job != null ? job.getBranchCode() : null,
                exception != null ? exception.getBranchCode() : null,
                pickupTask != null ? pickupTask.getOriginBranchCode() : null,
                "BR-" + currentBranchId
        );
        String currentBranchName = support.firstNonBlank(
                reqCurrentBranchName,
                job != null ? job.getBranchName() : null,
                exception != null ? exception.getBranchName() : null,
                pickupTask != null ? pickupTask.getOriginBranchName() : null,
                "Branch " + currentBranchId
        );

        Long originBranchId = firstNonNullLong(
                reqOriginBranchId,
                pickupTask != null ? pickupTask.getOriginBranchId() : null,
                orderSummary != null ? orderSummary.getOriginBranchId() : null,
                currentBranchId
        );
        String originBranchCode = support.firstNonBlank(
                reqOriginBranchCode,
                pickupTask != null ? pickupTask.getOriginBranchCode() : null,
                orderSummary != null ? orderSummary.getOriginBranchCode() : null,
                currentBranchCode
        );
        String originBranchName = support.firstNonBlank(
                reqOriginBranchName,
                pickupTask != null ? pickupTask.getOriginBranchName() : null,
                orderSummary != null ? orderSummary.getOriginBranchName() : null,
                currentBranchName
        );

        String returnToName = support.firstNonBlank(
                reqReturnToName,
                orderSummary != null ? orderSummary.getPickupContactName() : null,
                pickupTask != null ? pickupTask.getSenderName() : null,
                orderSummary != null ? orderSummary.getMerchantBusinessName() : null,
                "Sender / Merchant"
        );
        String returnToPhone = support.firstNonBlank(
                reqReturnToPhone,
                orderSummary != null ? orderSummary.getPickupContactPhone() : null,
                pickupTask != null ? pickupTask.getSenderPhone() : null,
                "N/A"
        );
        String returnAddress = support.firstNonBlank(
                reqReturnAddress,
                orderSummary != null ? orderSummary.getPickupAddress() : null,
                pickupTask != null ? pickupTask.getPickupAddress() : null,
                originBranchName + " Sender Return Desk"
        );

        LocalDateTime now = LocalDateTime.now();
        ReturnTask task = new ReturnTask();
        task.setReturnCode(support.generateUniqueCode("RTS", returnTaskRepository::existsByReturnCodeIgnoreCase));
        task.setOrderId(orderId);
        task.setTrackingNumber(trackingNumber);
        task.setParcelReference(trackingNumber);
        task.setDeliveryJobId(job != null ? job.getId() : null);
        task.setExceptionId(exception != null ? exception.getId() : null);
        task.setCurrentBranchId(currentBranchId);
        task.setCurrentBranchCode(currentBranchCode);
        task.setCurrentBranchName(currentBranchName);
        task.setOriginBranchId(originBranchId);
        task.setOriginBranchCode(originBranchCode);
        task.setOriginBranchName(originBranchName);
        task.setReturnToName(returnToName);
        task.setReturnToPhone(returnToPhone);
        task.setReturnAddress(returnAddress);
        task.setReason(reason.trim());
        task.setStatus(ReturnTaskStatus.PENDING_ASSIGNMENT);
        task.setMovementNotes(appendNote(null, now, "RTS initiated (" + support.actorName(principal) + "): " + reason.trim()
                + (notes != null && !notes.isBlank() ? " | " + notes.trim() : "")));
        task.setInitiatedById(principal.userId());
        task.setInitiatedByName(support.actorName(principal));
        task.setInitiatedAt(now);

        ReturnTask saved = returnTaskRepository.save(task);

        if (exception != null) {
            exception.setReturnTaskId(saved.getId());
            exceptionRepository.save(exception);
        }
        if (job != null && job.getStatus() != DeliveryJobStatus.RETURN_TO_SENDER && !job.getStatus().isTerminal()) {
            job.setStatus(DeliveryJobStatus.RETURN_TO_SENDER);
            job.setCompletedAt(now);
            deliveryJobRepository.save(job);
            support.deactivateActiveAssignments(
                    assignmentRepository.findByDeliveryJobIdOrderByAssignedAtDesc(job.getId()),
                    AssignmentStatus.CANCELLED,
                    "Superseded by return-to-sender task " + saved.getReturnCode()
            );
        }

        custodyTrackingService.recordCustody(
                saved.getOrderId(),
                saved.getTrackingNumber(),
                saved.getParcelReference(),
                null,
                null,
                saved.getId(),
                CustodyEventType.RTS_INITIATED,
                currentBranchId,
                currentBranchCode,
                currentBranchName,
                null,
                principal.userId(),
                support.actorName(principal),
                now,
                null,
                "Return-to-sender initiated: " + saved.getReason()
        );

        if (notifyOrderService) {
            support.notifyOrderStatus(
                    saved.getOrderId(),
                    "RETURN_TO_SENDER",
                    currentBranchName,
                    "Return-to-sender initiated (" + saved.getReturnCode() + "): " + saved.getReason(),
                    principal
            );
        }

        Map<String, Object> details = new HashMap<>();
        details.put("returnId", saved.getId());
        details.put("returnCode", saved.getReturnCode());
        details.put("orderId", saved.getOrderId());
        details.put("trackingNumber", saved.getTrackingNumber());
        details.put("originBranchId", saved.getOriginBranchId());
        details.put("originBranchName", saved.getOriginBranchName());
        details.put("currentBranchId", saved.getCurrentBranchId());
        details.put("currentBranchName", saved.getCurrentBranchName());
        details.put("reason", saved.getReason());
        support.publishEventSafely("dispatch.return.initiated", "ReturnToSenderInitiated", details);

        return toReturnTaskDto(saved);
    }

    public ReturnTaskDto assignCourier(
            String returnIdOrCode,
            AssignTransferCourierRequest request,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        ReturnTask task = findReturnTask(returnIdOrCode);
        if (task.getStatus().isTerminal()) {
            throw new DispatchValidationException(
                    "RETURN_TASK_TERMINAL",
                    "Cannot assign courier to terminal return task " + task.getReturnCode() + " (" + task.getStatus() + ")"
            );
        }
        support.enforceBranchAccess(principal, task.getCurrentBranchId(), "assign courier to return task");

        CourierProfileEntity courier = support.resolveCourier(request.getCourierId());
        BigDecimal weightKg = resolveParcelWeight(task);
        support.validateCourierEligibility(courier, task.getCurrentBranchId(), weightKg);

        List<CourierAssignment> existingAssignments = assignmentRepository.findByReturnTaskIdOrderByAssignedAtDesc(task.getId());
        support.deactivateActiveAssignments(existingAssignments, AssignmentStatus.REASSIGNED,
                support.firstNonBlank(request.getReason(), "Reassigned return courier"));

        LocalDateTime now = LocalDateTime.now();
        CourierAssignment assignment = new CourierAssignment();
        assignment.setAssignmentCode(support.generateUniqueCode("ASN", assignmentRepository::existsByAssignmentCodeIgnoreCase));
        assignment.setTaskType(AssignmentTaskType.RETURN);
        assignment.setOrderId(task.getOrderId());
        assignment.setTrackingNumber(task.getTrackingNumber());
        assignment.setReturnTask(task);
        assignment.setCourier(courier);
        assignment.setBranchId(task.getCurrentBranchId());
        assignment.setBranchCode(task.getCurrentBranchCode());
        assignment.setBranchName(task.getCurrentBranchName());
        assignment.setPriority(DeliveryPriority.NORMAL);
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setNotes(support.blankToNull(request.getNotes()));
        assignment.setAssignedByUserId(principal.userId());
        assignment.setAssignedByName(support.actorName(principal));
        assignment.setAssignedAt(now);
        assignmentRepository.save(assignment);

        task.setAssignedCourier(courier);
        task.setAssignedCourierCode(courier.getCourierCode());
        task.setAssignedCourierName(courier.getName());
        task.setAssignedAt(now);
        if (task.getStatus() == ReturnTaskStatus.PENDING_ASSIGNMENT) {
            task.setStatus(ReturnTaskStatus.COURIER_ASSIGNED);
        }
        task.setMovementNotes(appendNote(task.getMovementNotes(), now,
                "Courier assigned: " + courier.getName() + " (" + courier.getCourierCode() + ")"
                        + (request.getNotes() != null && !request.getNotes().isBlank() ? " | " + request.getNotes().trim() : "")));
        ReturnTask saved = returnTaskRepository.save(task);

        support.refreshCourierAvailabilityStatus(courier);

        custodyTrackingService.recordCustody(
                saved.getOrderId(),
                saved.getTrackingNumber(),
                saved.getParcelReference(),
                null,
                null,
                saved.getId(),
                CustodyEventType.RTS_COURIER_HANDOVER,
                saved.getCurrentBranchId(),
                saved.getCurrentBranchCode(),
                saved.getCurrentBranchName(),
                courier,
                principal.userId(),
                support.actorName(principal),
                now,
                null,
                "Courier " + courier.getName() + " assigned for return movement"
        );

        Map<String, Object> details = new HashMap<>();
        details.put("returnId", saved.getId());
        details.put("returnCode", saved.getReturnCode());
        details.put("orderId", saved.getOrderId());
        details.put("courierCode", courier.getCourierCode());
        details.put("courierName", courier.getName());
        support.publishEventSafely("dispatch.return.courier_assigned", "RETURN_COURIER_ASSIGNED", details);

        return toReturnTaskDto(saved);
    }

    public ReturnTaskDto recordMovement(
            String returnIdOrCode,
            RecordReturnMovementRequest request,
            DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        ReturnTask task = findReturnTask(returnIdOrCode);
        if (task.getStatus().isTerminal()) {
            throw new DispatchValidationException(
                    "RETURN_TASK_TERMINAL",
                    "Return task " + task.getReturnCode() + " is already " + task.getStatus()
            );
        }

        authorizeReturnActor(principal, task, request.getBranchId());

        ReturnTaskStatus targetStatus = ReturnTaskStatus.fromValue(request.getStatus());
        if (targetStatus == ReturnTaskStatus.RETURNED_TO_SENDER) {
            throw new DispatchValidationException(
                    "USE_CONFIRM_RETURN_ENDPOINT",
                    "Use the return confirmation endpoint (/returns/{id}/confirm) with sender confirmation to complete RTS"
            );
        }
        if (targetStatus != ReturnTaskStatus.IN_TRANSIT
                && targetStatus != ReturnTaskStatus.AT_ORIGIN_BRANCH
                && targetStatus != ReturnTaskStatus.OUT_FOR_RETURN) {
            throw new DispatchValidationException(
                    "INVALID_RETURN_MOVEMENT_STATUS",
                    "Return movement status must be IN_TRANSIT, AT_ORIGIN_BRANCH, or OUT_FOR_RETURN"
            );
        }
        if ((targetStatus == ReturnTaskStatus.IN_TRANSIT || targetStatus == ReturnTaskStatus.OUT_FOR_RETURN)
                && task.getAssignedCourier() == null) {
            throw new DispatchValidationException(
                    "COURIER_REQUIRED_FOR_RETURN_MOVEMENT",
                    "Assign a regular courier before moving return task " + task.getReturnCode()
            );
        }

        LocalDateTime now = LocalDateTime.now();
        CustodyEventType custodyEvent;
        Long eventBranchId = task.getCurrentBranchId();
        String eventBranchCode = task.getCurrentBranchCode();
        String eventBranchName = task.getCurrentBranchName();

        if (targetStatus == ReturnTaskStatus.IN_TRANSIT) {
            if (task.getDispatchedAt() == null) {
                task.setDispatchedAt(now);
            }
            if (request.getReturnManifestId() != null) {
                task.setReturnManifestId(request.getReturnManifestId());
            }
            markActiveReturnAssignmentsInTransit(task.getId(), now);
            custodyEvent = CustodyEventType.TRANSFER_IN_TRANSIT;
        } else if (targetStatus == ReturnTaskStatus.AT_ORIGIN_BRANCH) {
            if (request.getBranchId() != null && !Objects.equals(request.getBranchId(), task.getOriginBranchId())) {
                throw new DispatchValidationException(
                        "BRANCH_MISMATCH",
                        "Return arrival branch " + request.getBranchId()
                                + " does not match origin branch " + task.getOriginBranchId()
                );
            }
            task.setCurrentBranchId(task.getOriginBranchId());
            task.setCurrentBranchCode(support.firstNonBlank(request.getBranchCode(), task.getOriginBranchCode()));
            task.setCurrentBranchName(support.firstNonBlank(request.getBranchName(), task.getOriginBranchName()));
            if (task.getArrivedOriginBranchAt() == null) {
                task.setArrivedOriginBranchAt(now);
            }
            eventBranchId = task.getOriginBranchId();
            eventBranchCode = task.getOriginBranchCode();
            eventBranchName = task.getOriginBranchName();
            custodyEvent = CustodyEventType.RTS_ARRIVED_ORIGIN_BRANCH;
        } else {
            markActiveReturnAssignmentsInTransit(task.getId(), now);
            custodyEvent = CustodyEventType.RTS_COURIER_HANDOVER;
        }

        task.setStatus(targetStatus);
        String summary = "Movement -> " + targetStatus.name()
                + (request.getLocation() != null && !request.getLocation().isBlank() ? " at " + request.getLocation().trim() : "")
                + (request.getNotes() != null && !request.getNotes().isBlank() ? " | " + request.getNotes().trim() : "");
        task.setMovementNotes(appendNote(task.getMovementNotes(), now, summary));
        ReturnTask saved = returnTaskRepository.save(task);

        custodyTrackingService.recordCustody(
                saved.getOrderId(),
                saved.getTrackingNumber(),
                saved.getParcelReference(),
                saved.getReturnManifestId(),
                support.blankToNull(request.getManifestCode()),
                saved.getId(),
                custodyEvent,
                eventBranchId,
                eventBranchCode,
                eventBranchName,
                saved.getAssignedCourier(),
                principal.userId(),
                support.actorName(principal),
                now,
                null,
                summary
        );

        Map<String, Object> details = new HashMap<>();
        details.put("returnId", saved.getId());
        details.put("returnCode", saved.getReturnCode());
        details.put("orderId", saved.getOrderId());
        details.put("status", saved.getStatus().name());
        details.put("branchId", eventBranchId);
        support.publishEventSafely("dispatch.return.movement", "RETURN_TASK_MOVEMENT", details);

        return toReturnTaskDto(saved);
    }

    public ReturnTaskDto confirmReturnToSender(
            String returnIdOrCode,
            ConfirmReturnToSenderRequest request,
            DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        ReturnTask task = findReturnTask(returnIdOrCode);
        if (task.getStatus() == ReturnTaskStatus.RETURNED_TO_SENDER || task.getStatus() == ReturnTaskStatus.CANCELLED) {
            throw new DispatchValidationException(
                    "RETURN_TASK_TERMINAL",
                    "Return task " + task.getReturnCode() + " is already in terminal state " + task.getStatus()
            );
        }

        authorizeReturnActor(principal, task, task.getOriginBranchId());

        LocalDateTime now = LocalDateTime.now();
        String storedEvidence = evidenceStorageService.storeEvidenceReference(
                task.getTrackingNumber(),
                "rts-confirmation",
                request.getConfirmationReference()
        );

        task.setStatus(ReturnTaskStatus.RETURNED_TO_SENDER);
        task.setSenderConfirmedBy(request.getSenderConfirmedBy().trim());
        task.setSenderConfirmationReference(storedEvidence);
        task.setReturnedAt(now);
        task.setCurrentBranchId(task.getOriginBranchId());
        task.setCurrentBranchCode(task.getOriginBranchCode());
        task.setCurrentBranchName(task.getOriginBranchName());
        task.setMovementNotes(appendNote(task.getMovementNotes(), now,
                "Returned to sender (confirmed by: " + request.getSenderConfirmedBy().trim() + ")"
                        + (request.getNotes() != null && !request.getNotes().isBlank() ? " | " + request.getNotes().trim() : "")));

        ReturnTask saved = returnTaskRepository.save(task);

        List<CourierAssignment> assignments = assignmentRepository.findByReturnTaskIdOrderByAssignedAtDesc(saved.getId());
        support.deactivateActiveAssignments(assignments, AssignmentStatus.DELIVERED, "Return confirmed by sender");
        if (saved.getAssignedCourier() != null) {
            CourierProfileEntity courier = saved.getAssignedCourier();
            courier.setCompletedToday(courier.getCompletedToday() + 1);
            courier.setTotalCompletedLifetime(courier.getTotalCompletedLifetime() + 1);
            courier.setLastActiveAt(now);
            courierRepository.save(courier);
            support.refreshCourierAvailabilityStatus(courier);
        }

        if (saved.getDeliveryJobId() != null) {
            deliveryJobRepository.findById(saved.getDeliveryJobId()).ifPresent(job -> {
                job.setStatus(DeliveryJobStatus.RETURNED_TO_SENDER);
                job.setCompletedAt(now);
                deliveryJobRepository.save(job);
            });
        }

        custodyTrackingService.recordCustody(
                saved.getOrderId(),
                saved.getTrackingNumber(),
                saved.getParcelReference(),
                saved.getReturnManifestId(),
                null,
                saved.getId(),
                CustodyEventType.RTS_RETURNED_TO_SENDER,
                saved.getOriginBranchId(),
                saved.getOriginBranchCode(),
                saved.getOriginBranchName(),
                saved.getAssignedCourier(),
                principal.userId(),
                support.actorName(principal),
                now,
                null,
                "Parcel returned to sender (" + saved.getSenderConfirmedBy() + ")"
        );

        support.notifyOrderStatus(
                saved.getOrderId(),
                "RETURNED_TO_SENDER",
                saved.getOriginBranchName(),
                "Parcel returned to sender (" + saved.getSenderConfirmedBy() + ")",
                principal
        );

        Map<String, Object> details = new HashMap<>();
        details.put("returnId", saved.getId());
        details.put("returnCode", saved.getReturnCode());
        details.put("orderId", saved.getOrderId());
        details.put("trackingNumber", saved.getTrackingNumber());
        details.put("senderConfirmedBy", saved.getSenderConfirmedBy());
        support.publishEventSafely("dispatch.return.completed", "ReturnedToSender", details);

        return toReturnTaskDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ReturnTaskDto> listReturnTasks(Long branchId, String status, DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        List<ReturnTask> tasks;
        if (principal.isCourier() && !principal.isDispatcher() && !principal.isAdmin()) {
            CourierProfileEntity courier = support.resolveCurrentCourier(principal);
            tasks = returnTaskRepository.findByAssignedCourierIdOrderByCreatedAtDesc(courier.getId());
        } else {
            Long scopedBranchId = support.resolveScopedBranchId(principal, branchId);
            tasks = scopedBranchId != null
                    ? returnTaskRepository.findByCurrentOrOriginBranchOrderByCreatedAtDesc(scopedBranchId)
                    : returnTaskRepository.findAllByOrderByCreatedAtDesc();
        }
        if (status != null && !status.isBlank()) {
            ReturnTaskStatus filterStatus = ReturnTaskStatus.fromValue(status);
            tasks = tasks.stream().filter(t -> t.getStatus() == filterStatus).toList();
        }
        return tasks.stream().map(this::toReturnTaskDto).toList();
    }

    @Transactional(readOnly = true)
    public ReturnTaskDto getReturnTask(String returnIdOrCode, DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        ReturnTask task = findReturnTask(returnIdOrCode);
        authorizeReturnActor(principal, task, null);
        return toReturnTaskDto(task);
    }

    private ReturnTask findReturnTask(String returnIdOrCode) {
        if (returnIdOrCode == null || returnIdOrCode.isBlank()) {
            throw new DispatchValidationException("RETURN_ID_REQUIRED", "Return task identifier is required");
        }
        String key = returnIdOrCode.trim();
        if (key.chars().allMatch(Character::isDigit)) {
            return returnTaskRepository.findById(Long.parseLong(key))
                    .orElseThrow(() -> new ResourceNotFoundException("Return task", Long.parseLong(key)));
        }
        return returnTaskRepository.findByReturnCodeIgnoreCase(key)
                .orElseThrow(() -> new ResourceNotFoundException("Return task not found: " + key));
    }

    private void authorizeReturnActor(DispatchUserPrincipal principal, ReturnTask task, Long extraBranchId) {
        if (principal.isAdmin()) {
            return;
        }
        if (principal.isDispatcher()) {
            if (principal.branchId() == null) {
                throw new AccessDeniedException("Branch-scoped staff must have an assigned branchId claim");
            }
            boolean matches = Objects.equals(principal.branchId(), task.getCurrentBranchId())
                    || Objects.equals(principal.branchId(), task.getOriginBranchId())
                    || (extraBranchId != null && Objects.equals(principal.branchId(), extraBranchId));
            if (!matches) {
                throw new AccessDeniedException("Dispatcher is not authorized for return task " + task.getReturnCode());
            }
            return;
        }
        CourierProfileEntity courier = support.resolveCurrentCourier(principal);
        if (task.getAssignedCourier() == null || !Objects.equals(task.getAssignedCourier().getId(), courier.getId())) {
            throw new AccessDeniedException("Courier is not assigned to return task " + task.getReturnCode());
        }
    }

    private void markActiveReturnAssignmentsInTransit(Long returnTaskId, LocalDateTime now) {
        for (CourierAssignment assignment : assignmentRepository.findByReturnTaskIdOrderByAssignedAtDesc(returnTaskId)) {
            if (assignment.getStatus() != null && assignment.getStatus().isActiveWorkload()
                    && assignment.getStatus() != AssignmentStatus.IN_TRANSIT) {
                assignment.setStatus(AssignmentStatus.IN_TRANSIT);
                if (assignment.getPickedUpAt() == null) {
                    assignment.setPickedUpAt(now);
                }
                assignmentRepository.save(assignment);
            }
        }
    }

    private PickupTask resolvePickupTask(String orderId, String trackingNumber) {
        if (orderId != null && !orderId.isBlank()) {
            Optional<PickupTask> byOrder = pickupTaskRepository.findByOrderId(orderId.trim());
            if (byOrder.isPresent()) {
                return byOrder.get();
            }
        }
        if (trackingNumber != null && !trackingNumber.isBlank()) {
            return pickupTaskRepository.findByTrackingNumberIgnoreCase(trackingNumber.trim()).orElse(null);
        }
        return null;
    }

    private BigDecimal resolveParcelWeight(ReturnTask task) {
        if (task.getDeliveryJobId() != null) {
            Optional<DeliveryJob> job = deliveryJobRepository.findById(task.getDeliveryJobId());
            if (job.isPresent() && job.get().getWeightKg() != null) {
                return job.get().getWeightKg();
            }
        }
        Optional<PickupTask> pickup = pickupTaskRepository.findByOrderId(task.getOrderId());
        return pickup.map(PickupTask::getWeightKg).orElse(BigDecimal.ONE);
    }

    private ReturnTaskDto toReturnTaskDto(ReturnTask task) {
        ReturnTaskDto dto = new ReturnTaskDto();
        dto.setId(task.getId());
        dto.setReturnCode(task.getReturnCode());
        dto.setOrderId(task.getOrderId());
        dto.setTrackingNumber(task.getTrackingNumber());
        dto.setParcelReference(task.getParcelReference());
        dto.setDeliveryJobId(task.getDeliveryJobId());
        dto.setExceptionId(task.getExceptionId());
        dto.setCurrentBranchId(task.getCurrentBranchId());
        dto.setCurrentBranchCode(task.getCurrentBranchCode());
        dto.setCurrentBranchName(task.getCurrentBranchName());
        dto.setOriginBranchId(task.getOriginBranchId());
        dto.setOriginBranchCode(task.getOriginBranchCode());
        dto.setOriginBranchName(task.getOriginBranchName());
        dto.setReturnToName(task.getReturnToName());
        dto.setReturnToPhone(task.getReturnToPhone());
        dto.setReturnAddress(task.getReturnAddress());
        dto.setReason(task.getReason());
        dto.setStatus(task.getStatus().name());
        if (task.getAssignedCourier() != null) {
            dto.setAssignedCourierId(String.valueOf(task.getAssignedCourier().getId()));
        }
        dto.setAssignedCourierCode(task.getAssignedCourierCode());
        dto.setAssignedCourierName(task.getAssignedCourierName());
        dto.setReturnManifestId(task.getReturnManifestId());
        dto.setMovementNotes(task.getMovementNotes());
        dto.setSenderConfirmedBy(task.getSenderConfirmedBy());
        dto.setSenderConfirmationReference(task.getSenderConfirmationReference());
        dto.setInitiatedById(task.getInitiatedById());
        dto.setInitiatedByName(task.getInitiatedByName());
        dto.setInitiatedAt(task.getInitiatedAt() != null ? task.getInitiatedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setAssignedAt(task.getAssignedAt() != null ? task.getAssignedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setDispatchedAt(task.getDispatchedAt() != null ? task.getDispatchedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setArrivedOriginBranchAt(task.getArrivedOriginBranchAt() != null
                ? task.getArrivedOriginBranchAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setReturnedAt(task.getReturnedAt() != null ? task.getReturnedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setCustodyRecords(custodyTrackingService.getReturnTaskCustodyDtos(task.getId()));
        return dto;
    }

    private Long firstNonNullLong(Long... values) {
        for (Long v : values) {
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    private String appendNote(String existing, LocalDateTime now, String line) {
        String formatted = "[" + now.format(DispatchSupportService.ISO_FORMAT) + "] " + line;
        if (existing == null || existing.isBlank()) {
            return formatted;
        }
        String combined = existing + "\n" + formatted;
        return combined.length() > 1450 ? combined.substring(combined.length() - 1450) : combined;
    }
}
