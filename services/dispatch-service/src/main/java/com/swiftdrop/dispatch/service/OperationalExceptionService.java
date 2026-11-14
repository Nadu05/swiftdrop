package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderSummaryDto;
import com.swiftdrop.dispatch.dto.DeliveryExceptionDto;
import com.swiftdrop.dispatch.dto.ExceptionDecisionRequest;
import com.swiftdrop.dispatch.dto.ReportExceptionRequest;
import com.swiftdrop.dispatch.dto.ReturnTaskDto;
import com.swiftdrop.dispatch.dto.UpdateExceptionStatusRequest;
import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.*;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class OperationalExceptionService {

    private final DeliveryExceptionRepository exceptionRepository;
    private final DeliveryJobRepository deliveryJobRepository;
    private final PickupTaskRepository pickupTaskRepository;
    private final TransferManifestRepository manifestRepository;
    private final TransferManifestParcelRepository manifestParcelRepository;
    private final ReturnTaskRepository returnTaskRepository;
    private final PodEvidenceStorageService evidenceStorageService;
    private final CustodyTrackingService custodyTrackingService;
    private final ReturnTaskService returnTaskService;
    private final DispatchSupportService support;

    public OperationalExceptionService(
            DeliveryExceptionRepository exceptionRepository,
            DeliveryJobRepository deliveryJobRepository,
            PickupTaskRepository pickupTaskRepository,
            TransferManifestRepository manifestRepository,
            TransferManifestParcelRepository manifestParcelRepository,
            ReturnTaskRepository returnTaskRepository,
            PodEvidenceStorageService evidenceStorageService,
            CustodyTrackingService custodyTrackingService,
            ReturnTaskService returnTaskService,
            DispatchSupportService support) {
        this.exceptionRepository = exceptionRepository;
        this.deliveryJobRepository = deliveryJobRepository;
        this.pickupTaskRepository = pickupTaskRepository;
        this.manifestRepository = manifestRepository;
        this.manifestParcelRepository = manifestParcelRepository;
        this.returnTaskRepository = returnTaskRepository;
        this.evidenceStorageService = evidenceStorageService;
        this.custodyTrackingService = custodyTrackingService;
        this.returnTaskService = returnTaskService;
        this.support = support;
    }

    public DeliveryExceptionDto reportException(ReportExceptionRequest request, DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        ExceptionType type = ExceptionType.fromValue(request.getExceptionType());

        DeliveryJob job = request.getDeliveryJobId() != null
                ? deliveryJobRepository.findById(request.getDeliveryJobId())
                        .orElseThrow(() -> new ResourceNotFoundException("Delivery job", request.getDeliveryJobId()))
                : null;
        TransferManifest manifest = request.getManifestId() != null
                ? manifestRepository.findById(request.getManifestId())
                        .orElseThrow(() -> new ResourceNotFoundException("Transfer manifest", request.getManifestId()))
                : null;
        PickupTask pickupTask = request.getPickupTaskId() != null
                ? pickupTaskRepository.findById(request.getPickupTaskId())
                        .orElseThrow(() -> new ResourceNotFoundException("Pickup task", request.getPickupTaskId()))
                : null;
        ReturnTask returnTask = request.getReturnTaskId() != null
                ? returnTaskRepository.findById(request.getReturnTaskId())
                        .orElseThrow(() -> new ResourceNotFoundException("Return task", request.getReturnTaskId()))
                : null;

        String orderId = support.firstNonBlank(
                request.getOrderId(),
                job != null ? job.getOrderId() : null,
                pickupTask != null ? pickupTask.getOrderId() : null,
                returnTask != null ? returnTask.getOrderId() : null
        );
        String trackingNumber = support.firstNonBlank(
                request.getTrackingNumber(),
                job != null ? job.getTrackingNumber() : null,
                pickupTask != null ? pickupTask.getTrackingNumber() : null,
                returnTask != null ? returnTask.getTrackingNumber() : null
        );

        OrderSummaryDto orderSummary = null;
        if (orderId != null || trackingNumber != null) {
            if (pickupTask == null) {
                pickupTask = (orderId != null ? pickupTaskRepository.findByOrderId(orderId)
                        : pickupTaskRepository.findByTrackingNumberIgnoreCase(trackingNumber)).orElse(null);
            }
            if (job == null) {
                job = (orderId != null ? deliveryJobRepository.findByOrderId(orderId)
                        : deliveryJobRepository.findByTrackingNumberIgnoreCase(trackingNumber)).orElse(null);
            }
            orderSummary = support.fetchOrderQuietly(support.firstNonBlank(orderId, trackingNumber));
            orderId = support.firstNonBlank(orderId,
                    pickupTask != null ? pickupTask.getOrderId() : null,
                    job != null ? job.getOrderId() : null,
                    orderSummary != null ? orderSummary.resolvedOrderId() : null);
            trackingNumber = support.firstNonBlank(trackingNumber,
                    pickupTask != null ? pickupTask.getTrackingNumber() : null,
                    job != null ? job.getTrackingNumber() : null,
                    orderSummary != null ? orderSummary.getTrackingNumber() : null,
                    orderId);
        } else if (manifest != null) {
            // Manifest-level operational incident (e.g. TRANSFER_DELAY)
            orderId = manifest.getManifestCode();
            trackingNumber = manifest.getManifestCode();
        } else {
            throw new DispatchValidationException(
                    "MISSING_EXCEPTION_TARGET",
                    "Provide orderId, trackingNumber, deliveryJobId, pickupTaskId, manifestId, or returnTaskId"
            );
        }

        Long branchId = firstNonNullLong(
                request.getBranchId(),
                manifest != null ? manifest.getOriginBranchId() : null,
                job != null ? job.getBranchId() : null,
                pickupTask != null ? pickupTask.getOriginBranchId() : null,
                returnTask != null ? returnTask.getCurrentBranchId() : null,
                orderSummary != null ? orderSummary.getOriginBranchId() : null,
                principal.branchId()
        );
        String branchCode = support.firstNonBlank(
                request.getBranchCode(),
                manifest != null ? manifest.getOriginBranchCode() : null,
                job != null ? job.getBranchCode() : null,
                pickupTask != null ? pickupTask.getOriginBranchCode() : null,
                returnTask != null ? returnTask.getCurrentBranchCode() : null
        );
        String branchName = support.firstNonBlank(
                request.getBranchName(),
                manifest != null ? manifest.getOriginBranchName() : null,
                job != null ? job.getBranchName() : null,
                pickupTask != null ? pickupTask.getOriginBranchName() : null,
                returnTask != null ? returnTask.getCurrentBranchName() : null
        );

        authorizeReporter(principal, branchId, job, pickupTask, manifest, returnTask);

        LocalDateTime now = LocalDateTime.now();
        String storedEvidence = evidenceStorageService.storeEvidenceReference(
                trackingNumber,
                "exception-" + type.name().toLowerCase().replace('_', '-'),
                request.getEvidenceReference()
        );

        DeliveryException exception = new DeliveryException();
        exception.setExceptionCode(generateUniqueExceptionCode());
        exception.setDeliveryJob(job);
        exception.setOrderId(orderId);
        exception.setTrackingNumber(trackingNumber);
        exception.setBranchId(branchId);
        exception.setBranchCode(branchCode);
        exception.setBranchName(branchName);
        exception.setTransferManifestId(manifest != null ? manifest.getId() : null);
        exception.setManifestCode(manifest != null ? manifest.getManifestCode() : null);
        exception.setPickupTaskId(pickupTask != null ? pickupTask.getId() : null);
        exception.setReturnTaskId(returnTask != null ? returnTask.getId() : null);
        exception.setParcelReference(support.firstNonBlank(request.getParcelReference(), trackingNumber));
        exception.setExceptionType(type);
        exception.setDescription(request.getDescription().trim());
        exception.setLastFailureReason(request.getDescription().trim());
        exception.setFailedAttemptCount(job != null ? job.getAttemptCount() : 0);
        exception.setResponsibleUserId(principal.userId());
        exception.setResponsibleUserName(support.actorName(principal));
        exception.setResponsibleUserRole(support.actorRole(principal));
        exception.setEvidenceReference(storedEvidence);
        exception.setReportedAt(now);
        exception.setStatus((type == ExceptionType.DELIVERY_FAILURE || type == ExceptionType.RETURN_TO_SENDER_DECISION)
                ? ExceptionStatus.PENDING_DECISION
                : ExceptionStatus.OPEN);

        DeliveryException saved = exceptionRepository.save(exception);

        if (manifest != null && request.getOrderId() != null) {
            final String resolvedOrderId = orderId;
            manifestParcelRepository.findByManifestIdAndOrderId(manifest.getId(), resolvedOrderId)
                    .ifPresent(parcel -> {
                        parcel.setDiscrepancyNotes(request.getDescription().trim());
                        manifestParcelRepository.save(parcel);
                    });
        }

        CourierProfileEntity reportingCourier = principal.isCourier()
                ? support.resolveCurrentCourier(principal)
                : (manifest != null ? manifest.getAssignedCourier() : null);

        custodyTrackingService.recordCustody(
                saved.getOrderId(),
                saved.getTrackingNumber(),
                saved.getParcelReference(),
                saved.getTransferManifestId(),
                saved.getManifestCode(),
                saved.getReturnTaskId(),
                CustodyEventType.EXCEPTION_REPORTED,
                branchId,
                branchCode,
                branchName,
                reportingCourier,
                principal.userId(),
                support.actorName(principal),
                now,
                saved.getDescription(),
                "Exception reported (" + type.name() + "): " + saved.getDescription()
        );

        publishExceptionEvent("dispatch.exception.reported", "DISPATCH_EXCEPTION_REPORTED", saved);
        return support.toDeliveryExceptionDto(saved);
    }

    public DeliveryException createManifestDiscrepancyException(
            TransferManifest manifest,
            TransferManifestParcel parcel,
            ExceptionType type,
            String description,
            String evidenceRef,
            DispatchUserPrincipal principal) {
        LocalDateTime now = LocalDateTime.now();
        String storedEvidence = evidenceStorageService.storeEvidenceReference(
                parcel.getTrackingNumber(),
                "manifest-" + type.name().toLowerCase().replace('_', '-'),
                evidenceRef
        );

        DeliveryException exception = new DeliveryException();
        exception.setExceptionCode(generateUniqueExceptionCode());
        exception.setOrderId(parcel.getOrderId());
        exception.setTrackingNumber(parcel.getTrackingNumber());
        exception.setBranchId(manifest.getDestinationBranchId());
        exception.setBranchCode(manifest.getDestinationBranchCode());
        exception.setBranchName(manifest.getDestinationBranchName());
        exception.setTransferManifestId(manifest.getId());
        exception.setManifestCode(manifest.getManifestCode());
        exception.setPickupTaskId(parcel.getPickupTaskId());
        exception.setParcelReference(parcel.getParcelReference());
        exception.setExceptionType(type);
        exception.setStatus(ExceptionStatus.OPEN);
        exception.setFailedAttemptCount(0);
        exception.setDescription(description);
        exception.setLastFailureReason(description);
        exception.setResponsibleUserId(principal != null ? principal.userId() : "system");
        exception.setResponsibleUserName(support.actorName(principal));
        exception.setResponsibleUserRole(support.actorRole(principal));
        exception.setEvidenceReference(storedEvidence);
        exception.setReportedAt(now);

        DeliveryException saved = exceptionRepository.save(exception);
        publishExceptionEvent("dispatch.exception.reported", "MANIFEST_DISCREPANCY_EXCEPTION", saved);
        return saved;
    }

    public DeliveryExceptionDto updateExceptionStatus(
            Long exceptionId,
            UpdateExceptionStatusRequest request,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        DeliveryException ex = exceptionRepository.findById(exceptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery exception", exceptionId));
        support.enforceBranchAccess(principal, ex.getBranchId(), "update exception status");

        if (ex.getStatus() == ExceptionStatus.CLOSED) {
            throw new DispatchValidationException(
                    "EXCEPTION_ALREADY_CLOSED",
                    "Exception " + ex.getExceptionCode() + " is already closed"
            );
        }

        ExceptionStatus nextStatus = ExceptionStatus.fromValue(request.getStatus());
        LocalDateTime now = LocalDateTime.now();
        ex.setStatus(nextStatus);
        if (request.getResolutionNotes() != null && !request.getResolutionNotes().isBlank()) {
            ex.setResolutionNotes(request.getResolutionNotes().trim());
        }
        if (nextStatus.isTerminal()) {
            if (ex.getDecidedAt() == null) {
                ex.setDecidedAt(now);
            }
            if (ex.getDecidedById() == null) {
                ex.setDecidedById(principal.userId());
                ex.setDecidedByName(support.actorName(principal));
                ex.setDecidedByRole(support.actorRole(principal));
            }
        }

        DeliveryException saved = exceptionRepository.save(ex);
        publishExceptionEvent("dispatch.exception.updated", "DISPATCH_EXCEPTION_STATUS_UPDATED", saved);
        return support.toDeliveryExceptionDto(saved);
    }

    public DeliveryExceptionDto applyDispatcherDecision(
            DeliveryException ex,
            DispatcherDecisionAction action,
            ExceptionDecisionRequest request,
            DispatchUserPrincipal principal) {
        LocalDateTime now = LocalDateTime.now();
        if (request.getEvidenceReference() != null && !request.getEvidenceReference().isBlank()) {
            ex.setEvidenceReference(evidenceStorageService.storeEvidenceReference(
                    ex.getTrackingNumber(),
                    "exception-resolution",
                    request.getEvidenceReference()
            ));
        }

        ex.setDecisionAction(action);
        ex.setDecisionReason(request.getDecisionReason().trim());
        ex.setResolutionNotes(request.getDecisionReason().trim());
        ex.setDecidedById(principal.userId());
        ex.setDecidedByName(support.actorName(principal));
        ex.setDecidedByRole(support.actorRole(principal));
        ex.setDecidedAt(now);
        ex.setStatus(ExceptionStatus.RESOLVED);
        DeliveryException saved = exceptionRepository.save(ex);

        switch (action) {
            case RETURN_TO_SENDER -> {
                ReturnTaskDto returnTask = returnTaskService.initiateFromException(
                        saved,
                        request.getDecisionReason().trim(),
                        principal,
                        true
                );
                saved.setReturnTaskId(returnTask.getId());
                saved = exceptionRepository.save(saved);
            }
            case MARK_FOUND_RESUME -> {
                if (saved.getTransferManifestId() != null) {
                    TransferManifest manifest = manifestRepository.findById(saved.getTransferManifestId()).orElse(null);
                    manifestParcelRepository.findByManifestIdAndOrderId(saved.getTransferManifestId(), saved.getOrderId())
                            .ifPresent(parcel -> {
                                if (parcel.getStatus() == ManifestParcelStatus.MISSING) {
                                    parcel.setStatus(ManifestParcelStatus.RECEIVED);
                                    parcel.setReceivedAt(now);
                                    parcel.setDiscrepancyNotes("Located and resumed: " + request.getDecisionReason().trim());
                                    manifestParcelRepository.save(parcel);
                                    if (manifest != null) {
                                        PickupTask pt = pickupTaskRepository.findByOrderId(parcel.getOrderId()).orElse(null);
                                        OrderSummaryDto orderDto = support.fetchOrderQuietly(parcel.getOrderId());
                                        support.ensureDestinationDeliveryJob(manifest, parcel, pt, orderDto);
                                        support.notifyOrderStatus(
                                                parcel.getOrderId(),
                                                "AT_DESTINATION_BRANCH",
                                                manifest.getDestinationBranchName(),
                                                "Missing parcel located and received at destination branch",
                                                principal
                                        );
                                    }
                                }
                            });
                }
            }
            case WRITE_OFF_LOST, ACKNOWLEDGE_DAMAGE, CORRECT_HANDOVER, HOLD_AT_BRANCH, RESCHEDULE_DELIVERY -> {
                // Recorded in custody below; job-linked RESCHEDULE/HOLD handled by DispatchService when deliveryJob != null
            }
        }

        custodyTrackingService.recordCustody(
                saved.getOrderId(),
                saved.getTrackingNumber(),
                saved.getParcelReference(),
                saved.getTransferManifestId(),
                saved.getManifestCode(),
                saved.getReturnTaskId(),
                CustodyEventType.EXCEPTION_REPORTED,
                saved.getBranchId(),
                saved.getBranchCode(),
                saved.getBranchName(),
                null,
                principal.userId(),
                support.actorName(principal),
                now,
                null,
                "Dispatcher resolution (" + action.name() + "): " + request.getDecisionReason().trim()
        );

        publishExceptionEvent("dispatch.exception.resolved", "DISPATCH_EXCEPTION_RESOLVED", saved);
        return support.toDeliveryExceptionDto(saved);
    }

    private void authorizeReporter(
            DispatchUserPrincipal principal,
            Long branchId,
            DeliveryJob job,
            PickupTask pickupTask,
            TransferManifest manifest,
            ReturnTask returnTask) {
        if (principal.isAdmin()) {
            return;
        }
        if (principal.isDispatcher()) {
            if (principal.branchId() == null) {
                throw new AccessDeniedException("Branch-scoped staff must have an assigned branchId claim");
            }
            if (manifest != null) {
                boolean matchesManifestBranch = Objects.equals(principal.branchId(), manifest.getOriginBranchId())
                        || Objects.equals(principal.branchId(), manifest.getDestinationBranchId());
                if (!matchesManifestBranch) {
                    throw new AccessDeniedException("Dispatcher is not authorized to report exception on manifest " + manifest.getManifestCode());
                }
                return;
            }
            support.enforceBranchAccess(principal, branchId, "report exception");
            return;
        }

        CourierProfileEntity courier = support.resolveCurrentCourier(principal);
        boolean ownsJob = job != null && job.getAssignedCourierId() != null
                && Objects.equals(job.getAssignedCourierId(), courier.getId());
        boolean ownsPickup = pickupTask != null && pickupTask.getAssignedCourierId() != null
                && Objects.equals(pickupTask.getAssignedCourierId(), courier.getId());
        boolean ownsManifest = manifest != null && manifest.getAssignedCourier() != null
                && Objects.equals(manifest.getAssignedCourier().getId(), courier.getId());
        boolean ownsReturn = returnTask != null && returnTask.getAssignedCourier() != null
                && Objects.equals(returnTask.getAssignedCourier().getId(), courier.getId());
        if (!ownsJob && !ownsPickup && !ownsManifest && !ownsReturn) {
            throw new AccessDeniedException("Courier can only report exceptions on assigned tasks or manifests");
        }
    }

    private void publishExceptionEvent(String routingKey, String eventType, DeliveryException saved) {
        Map<String, Object> details = new HashMap<>();
        details.put("exceptionId", saved.getId());
        details.put("exceptionCode", saved.getExceptionCode());
        details.put("exceptionType", saved.getExceptionType().name());
        details.put("status", saved.getStatus().name());
        details.put("orderId", saved.getOrderId());
        details.put("trackingNumber", saved.getTrackingNumber());
        details.put("manifestId", saved.getTransferManifestId());
        details.put("manifestCode", saved.getManifestCode());
        details.put("branchId", saved.getBranchId());
        details.put("decisionAction", saved.getDecisionAction() != null ? saved.getDecisionAction().name() : null);
        support.publishEventSafely(routingKey, eventType, details);
    }

    private String generateUniqueExceptionCode() {
        return support.generateUniqueCode("EXC", code -> exceptionRepository.findByExceptionCodeIgnoreCase(code).isPresent());
    }

    private Long firstNonNullLong(Long... values) {
        for (Long v : values) {
            if (v != null) {
                return v;
            }
        }
        return null;
    }
}
