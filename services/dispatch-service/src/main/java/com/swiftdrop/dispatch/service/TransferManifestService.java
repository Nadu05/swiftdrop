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
public class TransferManifestService {

    private static final List<ManifestParcelStatus> BLOCKING_PARCEL_STATUSES = List.of(
            ManifestParcelStatus.MANIFESTED,
            ManifestParcelStatus.DISPATCHED
    );

    private static final List<TransferManifestStatus> ACTIVE_MANIFEST_STATUSES = List.of(
            TransferManifestStatus.DRAFT,
            TransferManifestStatus.ASSIGNED,
            TransferManifestStatus.IN_TRANSIT,
            TransferManifestStatus.RECEIVED_WITH_DISCREPANCY
    );

    private static final Set<String> TERMINAL_OR_INVALID_ORDER_STATUSES = Set.of(
            "DELIVERED",
            "RETURN_TO_SENDER",
            "RETURNED_TO_SENDER",
            "CANCELLED"
    );

    private final TransferManifestRepository manifestRepository;
    private final TransferManifestParcelRepository manifestParcelRepository;
    private final PickupTaskRepository pickupTaskRepository;
    private final DeliveryJobRepository deliveryJobRepository;
    private final ReturnTaskRepository returnTaskRepository;
    private final CourierAssignmentRepository assignmentRepository;
    private final CourierProfileRepository courierRepository;
    private final CustodyTrackingService custodyTrackingService;
    private final OperationalExceptionService operationalExceptionService;
    private final DispatchSupportService support;

    public TransferManifestService(
            TransferManifestRepository manifestRepository,
            TransferManifestParcelRepository manifestParcelRepository,
            PickupTaskRepository pickupTaskRepository,
            DeliveryJobRepository deliveryJobRepository,
            ReturnTaskRepository returnTaskRepository,
            CourierAssignmentRepository assignmentRepository,
            CourierProfileRepository courierRepository,
            CustodyTrackingService custodyTrackingService,
            OperationalExceptionService operationalExceptionService,
            DispatchSupportService support) {
        this.manifestRepository = manifestRepository;
        this.manifestParcelRepository = manifestParcelRepository;
        this.pickupTaskRepository = pickupTaskRepository;
        this.deliveryJobRepository = deliveryJobRepository;
        this.returnTaskRepository = returnTaskRepository;
        this.assignmentRepository = assignmentRepository;
        this.courierRepository = courierRepository;
        this.custodyTrackingService = custodyTrackingService;
        this.operationalExceptionService = operationalExceptionService;
        this.support = support;
    }

    @Transactional(readOnly = true)
    public List<ReadyForTransferParcelDto> listReadyForTransferParcels(
            Long originBranchId,
            Long destinationBranchId,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        Long scopedOriginBranchId = support.resolveScopedBranchId(principal, originBranchId);

        List<PickupTask> candidates = scopedOriginBranchId != null
                ? pickupTaskRepository.findByOriginBranchIdAndSameBranchFalseOrderByCreatedAtDesc(scopedOriginBranchId)
                : pickupTaskRepository.findBySameBranchFalseOrderByCreatedAtDesc();

        Set<String> blockedOrderIds = new HashSet<>(manifestParcelRepository.findBlockedOrderIds(
                BLOCKING_PARCEL_STATUSES,
                ACTIVE_MANIFEST_STATUSES
        ));

        return candidates.stream()
                .filter(task -> !task.isSameBranch())
                .filter(task -> task.getStatus() == PickupTaskStatus.PICKED_UP
                        || task.getStatus() == PickupTaskStatus.BRANCH_RECEIVED)
                .filter(task -> task.getOriginBranchId() != null && task.getDestinationBranchId() != null)
                .filter(task -> !Objects.equals(task.getOriginBranchId(), task.getDestinationBranchId()))
                .filter(task -> destinationBranchId == null || Objects.equals(destinationBranchId, task.getDestinationBranchId()))
                .filter(task -> !blockedOrderIds.contains(task.getOrderId()))
                .filter(task -> !deliveryJobRepository.existsByOrderId(task.getOrderId()))
                .filter(task -> !returnTaskRepository.existsByOrderIdAndStatusNot(task.getOrderId(), ReturnTaskStatus.CANCELLED))
                .map(this::toReadyParcelDto)
                .toList();
    }

    public TransferManifestDto createManifest(CreateTransferManifestRequest request, DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);

        Long originBranchId = resolveOriginBranchIdForCreate(request, principal);
        support.enforceBranchAccess(principal, originBranchId, "create transfer manifest");

        Long destinationBranchId = request.getDestinationBranchId();
        if (destinationBranchId == null) {
            throw new DispatchValidationException("DESTINATION_BRANCH_REQUIRED", "Destination branch id is required");
        }
        if (Objects.equals(originBranchId, destinationBranchId)) {
            throw new DispatchValidationException(
                    "SAME_BRANCH_TRANSFER_NOT_ALLOWED",
                    "Origin and destination branch cannot be the same for an inter-branch transfer manifest"
            );
        }

        TransferManifest manifest = new TransferManifest();
        manifest.setManifestCode(support.generateUniqueCode("TRF", manifestRepository::existsByManifestCodeIgnoreCase));
        manifest.setOriginBranchId(originBranchId);
        manifest.setOriginBranchCode(support.firstNonBlank(request.getOriginBranchCode(), "BR-" + originBranchId));
        manifest.setOriginBranchName(support.firstNonBlank(request.getOriginBranchName(), "Branch " + originBranchId));
        manifest.setDestinationBranchId(destinationBranchId);
        manifest.setDestinationBranchCode(support.firstNonBlank(request.getDestinationBranchCode(), "BR-" + destinationBranchId));
        manifest.setDestinationBranchName(support.firstNonBlank(request.getDestinationBranchName(), "Branch " + destinationBranchId));
        manifest.setStatus(TransferManifestStatus.DRAFT);
        manifest.setNotes(support.blankToNull(request.getNotes()));
        manifest.setCreatedById(principal.userId());
        manifest.setCreatedByName(support.actorName(principal));

        TransferManifest saved = manifestRepository.save(manifest);

        List<String> initialKeys = support.collectDistinctKeys(
                request.getParcelKeys(),
                request.getOrderIds(),
                request.getTrackingNumbers()
        );
        if (!initialKeys.isEmpty()) {
            saved = addParcelsInternal(saved, initialKeys);
        }

        Map<String, Object> details = new HashMap<>();
        details.put("manifestId", saved.getId());
        details.put("manifestCode", saved.getManifestCode());
        details.put("originBranchId", saved.getOriginBranchId());
        details.put("destinationBranchId", saved.getDestinationBranchId());
        details.put("expectedParcelCount", saved.getExpectedParcelCount());
        support.publishEventSafely("dispatch.transfer.created", "TRANSFER_MANIFEST_CREATED", details);

        return toManifestDto(saved);
    }

    public TransferManifestDto addParcels(
            String manifestIdOrCode,
            AddManifestParcelsRequest request,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        TransferManifest manifest = findManifest(manifestIdOrCode);
        support.enforceBranchAccess(principal, manifest.getOriginBranchId(), "add parcels to transfer manifest");

        if (manifest.getStatus() != TransferManifestStatus.DRAFT
                && manifest.getStatus() != TransferManifestStatus.ASSIGNED) {
            throw new DispatchValidationException(
                    "MANIFEST_NOT_EDITABLE",
                    "Parcels can only be added while manifest is DRAFT or ASSIGNED (current status: " + manifest.getStatus() + ")"
            );
        }

        List<String> keys = support.collectDistinctKeys(
                request.getParcelKeys(),
                request.getOrderIds(),
                request.getTrackingNumbers()
        );
        if (keys.isEmpty()) {
            throw new DispatchValidationException("PARCEL_KEYS_REQUIRED", "At least one parcel key, order id, or tracking number is required");
        }

        TransferManifest saved = addParcelsInternal(manifest, keys);
        return toManifestDto(saved);
    }

    public TransferManifestDto removeParcel(
            String manifestIdOrCode,
            String parcelKey,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        TransferManifest manifest = findManifest(manifestIdOrCode);
        support.enforceBranchAccess(principal, manifest.getOriginBranchId(), "remove parcel from transfer manifest");

        if (manifest.getStatus() != TransferManifestStatus.DRAFT
                && manifest.getStatus() != TransferManifestStatus.ASSIGNED) {
            throw new DispatchValidationException(
                    "MANIFEST_NOT_EDITABLE",
                    "Parcels cannot be removed after manifest departure (status: " + manifest.getStatus() + ")"
            );
        }

        TransferManifestParcel target = findParcelOnManifest(manifest, parcelKey)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel " + parcelKey + " not found in manifest " + manifest.getManifestCode()));

        manifest.getParcels().remove(target);
        manifest.setExpectedParcelCount(countActiveManifestParcels(manifest));
        TransferManifest saved = manifestRepository.save(manifest);
        return toManifestDto(saved);
    }

    public TransferManifestDto assignCourier(
            String manifestIdOrCode,
            AssignTransferCourierRequest request,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        TransferManifest manifest = findManifest(manifestIdOrCode);
        support.enforceBranchAccess(principal, manifest.getOriginBranchId(), "assign courier to transfer manifest");

        if (manifest.getStatus() != TransferManifestStatus.DRAFT
                && manifest.getStatus() != TransferManifestStatus.ASSIGNED) {
            throw new DispatchValidationException(
                    "MANIFEST_CANNOT_ASSIGN_COURIER",
                    "Cannot assign courier when manifest status is " + manifest.getStatus()
            );
        }

        CourierProfileEntity courier = support.resolveCourier(request.getCourierId());
        BigDecimal totalWeight = computeActiveWeightKg(manifest);
        support.validateCourierEligibility(courier, manifest.getOriginBranchId(), totalWeight);

        List<CourierAssignment> existingAssignments = assignmentRepository.findByTransferManifestIdOrderByAssignedAtDesc(manifest.getId());
        support.deactivateActiveAssignments(existingAssignments, AssignmentStatus.REASSIGNED,
                support.firstNonBlank(request.getReason(), "Reassigned transfer manifest courier"));

        LocalDateTime now = LocalDateTime.now();
        CourierAssignment assignment = new CourierAssignment();
        assignment.setAssignmentCode(support.generateUniqueCode("ASN", assignmentRepository::existsByAssignmentCodeIgnoreCase));
        assignment.setTaskType(AssignmentTaskType.TRANSFER);
        assignment.setOrderId(manifest.getManifestCode());
        assignment.setTrackingNumber(manifest.getManifestCode());
        assignment.setTransferManifest(manifest);
        assignment.setCourier(courier);
        assignment.setBranchId(manifest.getOriginBranchId());
        assignment.setBranchCode(manifest.getOriginBranchCode());
        assignment.setBranchName(manifest.getOriginBranchName());
        assignment.setPriority(DeliveryPriority.NORMAL);
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setNotes(support.blankToNull(request.getNotes()));
        assignment.setAssignedByUserId(principal.userId());
        assignment.setAssignedByName(support.actorName(principal));
        assignment.setAssignedAt(now);
        assignmentRepository.save(assignment);

        manifest.setAssignedCourier(courier);
        manifest.setAssignedCourierCode(courier.getCourierCode());
        manifest.setAssignedCourierName(courier.getName());
        manifest.setVehicleType(courier.getVehicleType() != null ? courier.getVehicleType().name() : null);
        manifest.setVehiclePlate(courier.getVehiclePlate());
        manifest.setStatus(TransferManifestStatus.ASSIGNED);
        TransferManifest saved = manifestRepository.save(manifest);

        support.refreshCourierAvailabilityStatus(courier);

        Map<String, Object> details = new HashMap<>();
        details.put("manifestId", saved.getId());
        details.put("manifestCode", saved.getManifestCode());
        details.put("courierCode", courier.getCourierCode());
        details.put("courierName", courier.getName());
        details.put("originBranchId", saved.getOriginBranchId());
        details.put("destinationBranchId", saved.getDestinationBranchId());
        support.publishEventSafely("dispatch.transfer.assigned", "TRANSFER_MANIFEST_ASSIGNED", details);

        return toManifestDto(saved);
    }

    public TransferManifestDto departManifest(
            String manifestIdOrCode,
            DepartManifestRequest request,
            DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        TransferManifest manifest = findManifest(manifestIdOrCode);
        authorizeDepartureActor(principal, manifest);

        if (manifest.getStatus() != TransferManifestStatus.DRAFT
                && manifest.getStatus() != TransferManifestStatus.ASSIGNED) {
            throw new DispatchValidationException(
                    "INVALID_MANIFEST_STATE_FOR_DEPARTURE",
                    "Manifest " + manifest.getManifestCode() + " cannot depart from status " + manifest.getStatus()
            );
        }
        if (manifest.getAssignedCourier() == null) {
            throw new DispatchValidationException(
                    "COURIER_REQUIRED_FOR_DEPARTURE",
                    "Assign a regular courier to manifest " + manifest.getManifestCode() + " before departure"
            );
        }

        List<TransferManifestParcel> activeParcels = manifest.getParcels().stream()
                .filter(p -> p.getStatus() == ManifestParcelStatus.MANIFESTED)
                .toList();
        if (activeParcels.isEmpty()) {
            throw new DispatchValidationException(
                    "EMPTY_MANIFEST",
                    "Manifest " + manifest.getManifestCode() + " must contain at least one parcel before departure"
            );
        }

        support.validateVehicleWeightCapacity(manifest.getAssignedCourier(), computeActiveWeightKg(manifest));

        LocalDateTime now = LocalDateTime.now();
        String handoverId = support.firstNonBlank(request != null ? request.getEmployeeId() : null, principal.userId());
        String handoverName = support.firstNonBlank(request != null ? request.getEmployeeName() : null, support.actorName(principal));

        manifest.setOriginHandoverById(handoverId);
        manifest.setOriginHandoverByName(handoverName);
        manifest.setOriginHandoverAt(now);
        manifest.setDepartureAt(now);
        manifest.setExpectedParcelCount(activeParcels.size());
        manifest.setStatus(TransferManifestStatus.IN_TRANSIT);

        List<String> departureNotes = new ArrayList<>();
        if (manifest.getNotes() != null && !manifest.getNotes().isBlank()) {
            departureNotes.add(manifest.getNotes());
        }
        if (request != null && request.getSealNumber() != null && !request.getSealNumber().isBlank()) {
            departureNotes.add("Seal: " + request.getSealNumber().trim());
        }
        if (request != null && request.getHandoverNotes() != null && !request.getHandoverNotes().isBlank()) {
            departureNotes.add("Origin handover: " + request.getHandoverNotes().trim());
        }
        if (!departureNotes.isEmpty()) {
            manifest.setNotes(String.join(" | ", departureNotes));
        }

        for (TransferManifestParcel parcel : activeParcels) {
            parcel.setStatus(ManifestParcelStatus.DISPATCHED);
            parcel.setDispatchedAt(now);

            custodyTrackingService.recordCustody(
                    parcel.getOrderId(),
                    parcel.getTrackingNumber(),
                    parcel.getParcelReference(),
                    manifest.getId(),
                    manifest.getManifestCode(),
                    null,
                    CustodyEventType.MANIFEST_HANDOVER_DEPARTURE,
                    manifest.getOriginBranchId(),
                    manifest.getOriginBranchCode(),
                    manifest.getOriginBranchName(),
                    manifest.getAssignedCourier(),
                    handoverId,
                    handoverName,
                    now,
                    null,
                    "Origin branch handover to courier " + manifest.getAssignedCourierName()
                            + " for transfer to " + manifest.getDestinationBranchName()
            );

            support.notifyOrderStatus(
                    parcel.getOrderId(),
                    "IN_TRANSIT",
                    manifest.getOriginBranchName() + " -> " + manifest.getDestinationBranchName(),
                    "Dispatched on inter-branch manifest " + manifest.getManifestCode()
                            + " with courier " + manifest.getAssignedCourierName(),
                    principal
            );
        }

        for (CourierAssignment assignment : assignmentRepository.findByTransferManifestIdOrderByAssignedAtDesc(manifest.getId())) {
            if (assignment.getStatus() != null && assignment.getStatus().isActiveWorkload()) {
                assignment.setStatus(AssignmentStatus.IN_TRANSIT);
                if (assignment.getPickedUpAt() == null) {
                    assignment.setPickedUpAt(now);
                }
                assignmentRepository.save(assignment);
            }
        }

        TransferManifest saved = manifestRepository.save(manifest);

        Map<String, Object> details = new HashMap<>();
        details.put("manifestId", saved.getId());
        details.put("manifestCode", saved.getManifestCode());
        details.put("originBranchId", saved.getOriginBranchId());
        details.put("originBranchName", saved.getOriginBranchName());
        details.put("destinationBranchId", saved.getDestinationBranchId());
        details.put("destinationBranchName", saved.getDestinationBranchName());
        details.put("courierCode", saved.getAssignedCourierCode());
        details.put("courierName", saved.getAssignedCourierName());
        details.put("parcelCount", activeParcels.size());
        details.put("trackingNumbers", activeParcels.stream().map(TransferManifestParcel::getTrackingNumber).toList());
        support.publishEventSafely("dispatch.transfer.dispatched", "TransferManifestDispatched", details);

        return toManifestDto(saved);
    }

    public TransferManifestDto receiveManifest(
            String manifestIdOrCode,
            ReceiveManifestRequest request,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        TransferManifest manifest = findManifest(manifestIdOrCode);
        support.enforceBranchAccess(principal, manifest.getDestinationBranchId(), "receive transfer manifest at destination branch");

        if (manifest.getStatus() != TransferManifestStatus.IN_TRANSIT) {
            throw new DispatchValidationException(
                    "INVALID_MANIFEST_STATE_FOR_RECEIPT",
                    "Manifest " + manifest.getManifestCode() + " must be IN_TRANSIT before destination receipt (current: " + manifest.getStatus() + ")"
            );
        }

        List<TransferManifestParcel> dispatchedParcels = manifest.getParcels().stream()
                .filter(p -> p.getStatus() == ManifestParcelStatus.DISPATCHED)
                .toList();
        if (dispatchedParcels.isEmpty()) {
            throw new DispatchValidationException("NO_DISPATCHED_PARCELS", "No dispatched parcels to receive on manifest " + manifest.getManifestCode());
        }

        ReceiveManifestRequest effectiveRequest = request != null ? request : new ReceiveManifestRequest();
        Map<String, ReceiptClassification> classificationByOrderId = classifyManifestParcels(dispatchedParcels, effectiveRequest);

        LocalDateTime now = LocalDateTime.now();
        int receivedCount = 0;
        int missingCount = 0;
        int damagedCount = 0;

        for (TransferManifestParcel parcel : dispatchedParcels) {
            ReceiptClassification decision = classificationByOrderId.get(parcel.getOrderId());
            if (decision.status() == ManifestParcelStatus.RECEIVED) {
                receivedCount++;
                parcel.setStatus(ManifestParcelStatus.RECEIVED);
                parcel.setReceivedAt(now);

                custodyTrackingService.recordCustody(
                        parcel.getOrderId(),
                        parcel.getTrackingNumber(),
                        parcel.getParcelReference(),
                        manifest.getId(),
                        manifest.getManifestCode(),
                        null,
                        CustodyEventType.DESTINATION_BRANCH_RECEIPT,
                        manifest.getDestinationBranchId(),
                        manifest.getDestinationBranchCode(),
                        manifest.getDestinationBranchName(),
                        manifest.getAssignedCourier(),
                        principal.userId(),
                        support.actorName(principal),
                        now,
                        null,
                        "Parcel verified and received at destination branch " + manifest.getDestinationBranchName()
                );

                PickupTask pickupTask = parcel.getPickupTaskId() != null
                        ? pickupTaskRepository.findById(parcel.getPickupTaskId()).orElse(null)
                        : pickupTaskRepository.findByOrderId(parcel.getOrderId()).orElse(null);
                OrderSummaryDto orderSummary = support.fetchOrderQuietly(parcel.getOrderId());
                support.ensureDestinationDeliveryJob(manifest, parcel, pickupTask, orderSummary);

                support.notifyOrderStatus(
                        parcel.getOrderId(),
                        "AT_DESTINATION_BRANCH",
                        manifest.getDestinationBranchName(),
                        "Arrived at destination branch " + manifest.getDestinationBranchName()
                                + " via manifest " + manifest.getManifestCode(),
                        principal
                );

                Map<String, Object> arrivedDetails = new HashMap<>();
                arrivedDetails.put("manifestId", manifest.getId());
                arrivedDetails.put("manifestCode", manifest.getManifestCode());
                arrivedDetails.put("orderId", parcel.getOrderId());
                arrivedDetails.put("trackingNumber", parcel.getTrackingNumber());
                arrivedDetails.put("destinationBranchId", manifest.getDestinationBranchId());
                arrivedDetails.put("destinationBranchCode", manifest.getDestinationBranchCode());
                arrivedDetails.put("destinationBranchName", manifest.getDestinationBranchName());
                support.publishEventSafely(
                        "dispatch.parcel.received_at_destination_branch",
                        "ParcelReceivedAtDestinationBranch",
                        arrivedDetails
                );
            } else if (decision.status() == ManifestParcelStatus.MISSING) {
                missingCount++;
                parcel.setStatus(ManifestParcelStatus.MISSING);
                String note = support.firstNonBlank(decision.notes(), effectiveRequest.getDiscrepancyNotes(),
                        "Parcel missing during destination receipt for manifest " + manifest.getManifestCode());
                parcel.setDiscrepancyNotes(note);

                custodyTrackingService.recordCustody(
                        parcel.getOrderId(),
                        parcel.getTrackingNumber(),
                        parcel.getParcelReference(),
                        manifest.getId(),
                        manifest.getManifestCode(),
                        null,
                        CustodyEventType.TRANSFER_DISCREPANCY,
                        manifest.getDestinationBranchId(),
                        manifest.getDestinationBranchCode(),
                        manifest.getDestinationBranchName(),
                        manifest.getAssignedCourier(),
                        principal.userId(),
                        support.actorName(principal),
                        now,
                        note,
                        "Discrepancy: parcel missing on manifest arrival"
                );

                operationalExceptionService.createManifestDiscrepancyException(
                        manifest,
                        parcel,
                        ExceptionType.MISSING_PARCEL,
                        note,
                        decision.evidenceReference(),
                        principal
                );
            } else if (decision.status() == ManifestParcelStatus.DAMAGED) {
                damagedCount++;
                parcel.setStatus(ManifestParcelStatus.DAMAGED);
                parcel.setReceivedAt(now);
                String note = support.firstNonBlank(decision.notes(), effectiveRequest.getDiscrepancyNotes(),
                        "Parcel arrived damaged on manifest " + manifest.getManifestCode());
                parcel.setDiscrepancyNotes(note);

                custodyTrackingService.recordCustody(
                        parcel.getOrderId(),
                        parcel.getTrackingNumber(),
                        parcel.getParcelReference(),
                        manifest.getId(),
                        manifest.getManifestCode(),
                        null,
                        CustodyEventType.TRANSFER_DISCREPANCY,
                        manifest.getDestinationBranchId(),
                        manifest.getDestinationBranchCode(),
                        manifest.getDestinationBranchName(),
                        manifest.getAssignedCourier(),
                        principal.userId(),
                        support.actorName(principal),
                        now,
                        note,
                        "Discrepancy: parcel arrived damaged on manifest arrival"
                );

                operationalExceptionService.createManifestDiscrepancyException(
                        manifest,
                        parcel,
                        ExceptionType.DAMAGED_PARCEL,
                        note,
                        decision.evidenceReference(),
                        principal
                );
            }
        }

        manifest.setExpectedParcelCount(dispatchedParcels.size());
        manifest.setReceivedParcelCount(receivedCount);
        manifest.setMissingParcelCount(missingCount);
        manifest.setDamagedParcelCount(damagedCount);
        manifest.setArrivalAt(now);
        manifest.setDestinationReceivedAt(now);
        manifest.setDestinationReceivedById(principal.userId());
        manifest.setDestinationReceivedByName(support.actorName(principal));

        if (missingCount == 0 && damagedCount == 0) {
            manifest.setStatus(TransferManifestStatus.COMPLETED);
            manifest.setCompletedAt(now);
            manifest.setDiscrepancyNotes(support.blankToNull(effectiveRequest.getDiscrepancyNotes()));
        } else {
            manifest.setStatus(TransferManifestStatus.RECEIVED_WITH_DISCREPANCY);
            String summary = "Verified counts: expected=" + dispatchedParcels.size()
                    + ", received=" + receivedCount + ", missing=" + missingCount + ", damaged=" + damagedCount;
            String reqDiscrepancy = support.blankToNull(effectiveRequest.getDiscrepancyNotes());
            manifest.setDiscrepancyNotes(reqDiscrepancy != null ? reqDiscrepancy + " | " + summary : summary);
        }

        if (effectiveRequest.getNotes() != null && !effectiveRequest.getNotes().isBlank()) {
            String existing = manifest.getNotes();
            manifest.setNotes(existing != null && !existing.isBlank()
                    ? existing + " | Destination receipt: " + effectiveRequest.getNotes().trim()
                    : "Destination receipt: " + effectiveRequest.getNotes().trim());
        }

        List<CourierAssignment> assignments = assignmentRepository.findByTransferManifestIdOrderByAssignedAtDesc(manifest.getId());
        support.deactivateActiveAssignments(assignments, AssignmentStatus.DELIVERED, "Transfer manifest arrived at destination branch");
        if (manifest.getAssignedCourier() != null) {
            CourierProfileEntity courier = manifest.getAssignedCourier();
            courier.setCompletedToday(courier.getCompletedToday() + 1);
            courier.setTotalCompletedLifetime(courier.getTotalCompletedLifetime() + 1);
            courier.setLastActiveAt(now);
            courierRepository.save(courier);
            support.refreshCourierAvailabilityStatus(courier);
        }

        TransferManifest saved = manifestRepository.save(manifest);

        Map<String, Object> details = new HashMap<>();
        details.put("manifestId", saved.getId());
        details.put("manifestCode", saved.getManifestCode());
        details.put("status", saved.getStatus().name());
        details.put("expectedParcelCount", saved.getExpectedParcelCount());
        details.put("receivedParcelCount", saved.getReceivedParcelCount());
        details.put("missingParcelCount", saved.getMissingParcelCount());
        details.put("damagedParcelCount", saved.getDamagedParcelCount());
        support.publishEventSafely("dispatch.transfer.received", "TRANSFER_MANIFEST_RECEIVED", details);
        if (saved.getStatus() == TransferManifestStatus.COMPLETED) {
            support.publishEventSafely("dispatch.transfer.completed", "TRANSFER_MANIFEST_COMPLETED", details);
        }

        return toManifestDto(saved);
    }

    public TransferManifestDto completeManifest(
            String manifestIdOrCode,
            String notes,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        TransferManifest manifest = findManifest(manifestIdOrCode);
        support.enforceBranchAccess(principal, manifest.getDestinationBranchId(), "complete transfer manifest");

        if (manifest.getStatus() != TransferManifestStatus.RECEIVED_WITH_DISCREPANCY) {
            throw new DispatchValidationException(
                    "INVALID_MANIFEST_STATE_FOR_COMPLETION",
                    "Only RECEIVED_WITH_DISCREPANCY manifests require explicit discrepancy completion (current: " + manifest.getStatus() + ")"
            );
        }

        LocalDateTime now = LocalDateTime.now();
        manifest.setStatus(TransferManifestStatus.COMPLETED);
        manifest.setCompletedAt(now);
        if (notes != null && !notes.isBlank()) {
            String prev = manifest.getDiscrepancyNotes();
            manifest.setDiscrepancyNotes(prev != null && !prev.isBlank()
                    ? prev + " | Closure: " + notes.trim()
                    : "Closure: " + notes.trim());
        }
        TransferManifest saved = manifestRepository.save(manifest);

        Map<String, Object> details = new HashMap<>();
        details.put("manifestId", saved.getId());
        details.put("manifestCode", saved.getManifestCode());
        details.put("status", saved.getStatus().name());
        support.publishEventSafely("dispatch.transfer.completed", "TRANSFER_MANIFEST_COMPLETED", details);

        return toManifestDto(saved);
    }

    public TransferManifestDto cancelManifest(
            String manifestIdOrCode,
            String reason,
            DispatchUserPrincipal principal) {
        support.requireDispatcherOrAdmin(principal);
        TransferManifest manifest = findManifest(manifestIdOrCode);
        support.enforceBranchAccess(principal, manifest.getOriginBranchId(), "cancel transfer manifest");

        if (manifest.getStatus() != TransferManifestStatus.DRAFT
                && manifest.getStatus() != TransferManifestStatus.ASSIGNED) {
            throw new DispatchValidationException(
                    "MANIFEST_CANNOT_CANCEL",
                    "Cannot cancel manifest in status " + manifest.getStatus()
            );
        }

        for (TransferManifestParcel parcel : manifest.getParcels()) {
            parcel.setStatus(ManifestParcelStatus.REMOVED);
            parcel.setDiscrepancyNotes(support.firstNonBlank(reason, "Manifest cancelled"));
        }
        manifest.setStatus(TransferManifestStatus.CANCELLED);
        manifest.setCompletedAt(LocalDateTime.now());
        if (reason != null && !reason.isBlank()) {
            manifest.setNotes(manifest.getNotes() != null
                    ? manifest.getNotes() + " | Cancelled: " + reason.trim()
                    : "Cancelled: " + reason.trim());
        }

        support.deactivateActiveAssignments(
                assignmentRepository.findByTransferManifestIdOrderByAssignedAtDesc(manifest.getId()),
                AssignmentStatus.CANCELLED,
                support.firstNonBlank(reason, "Manifest cancelled")
        );

        TransferManifest saved = manifestRepository.save(manifest);
        return toManifestDto(saved);
    }

    @Transactional(readOnly = true)
    public List<TransferManifestDto> listManifests(Long branchId, String status, DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        List<TransferManifest> manifests;
        if (principal.isCourier() && !principal.isDispatcher() && !principal.isAdmin()) {
            CourierProfileEntity courier = support.resolveCurrentCourier(principal);
            manifests = manifestRepository.findByAssignedCourierIdOrderByCreatedAtDesc(courier.getId());
        } else {
            Long scopedBranchId = support.resolveScopedBranchId(principal, branchId);
            manifests = scopedBranchId != null
                    ? manifestRepository.findByOriginOrDestinationBranchOrderByCreatedAtDesc(scopedBranchId)
                    : manifestRepository.findAllByOrderByCreatedAtDesc();
        }
        if (status != null && !status.isBlank()) {
            TransferManifestStatus filterStatus = TransferManifestStatus.valueOf(status.trim().toUpperCase());
            manifests = manifests.stream().filter(m -> m.getStatus() == filterStatus).toList();
        }
        return manifests.stream().map(this::toManifestDto).toList();
    }

    @Transactional(readOnly = true)
    public TransferManifestDto getManifest(String manifestIdOrCode, DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        TransferManifest manifest = findManifest(manifestIdOrCode);
        authorizeManifestViewer(principal, manifest);
        return toManifestDto(manifest);
    }

    private TransferManifest addParcelsInternal(TransferManifest manifest, List<String> keys) {
        for (String key : keys) {
            ParcelCandidate candidate = resolveEligibleParcelCandidate(manifest, key);
            enrichDefaultBranchNames(manifest, candidate);

            boolean alreadyOnThisManifest = manifest.getParcels().stream()
                    .anyMatch(p -> p.getOrderId().equals(candidate.orderId()) && p.getStatus() != ManifestParcelStatus.REMOVED);
            if (alreadyOnThisManifest) {
                throw new DispatchValidationException(
                        "PARCEL_ALREADY_IN_MANIFEST",
                        "Parcel " + candidate.trackingNumber() + " is already in manifest " + manifest.getManifestCode()
                );
            }

            if (manifestParcelRepository.existsConflictingActiveParcel(
                    candidate.orderId(),
                    candidate.trackingNumber(),
                    BLOCKING_PARCEL_STATUSES,
                    ACTIVE_MANIFEST_STATUSES)) {
                throw new DispatchValidationException(
                        "CONFLICT_ACTIVE_MANIFEST",
                        "Parcel " + candidate.trackingNumber() + " is already assigned to another active transfer manifest"
                );
            }

            Optional<TransferManifestParcel> removedExisting = manifest.getParcels().stream()
                    .filter(p -> p.getOrderId().equals(candidate.orderId()) && p.getStatus() == ManifestParcelStatus.REMOVED)
                    .findFirst();

            if (removedExisting.isPresent()) {
                TransferManifestParcel parcel = removedExisting.get();
                parcel.setStatus(ManifestParcelStatus.MANIFESTED);
                parcel.setDiscrepancyNotes(null);
            } else {
                TransferManifestParcel parcel = new TransferManifestParcel();
                parcel.setPickupTaskId(candidate.pickupTaskId());
                parcel.setOrderId(candidate.orderId());
                parcel.setTrackingNumber(candidate.trackingNumber());
                parcel.setParcelReference(candidate.trackingNumber());
                parcel.setWeightKg(candidate.weightKg());
                parcel.setParcelCategory(candidate.parcelCategory());
                parcel.setStatus(ManifestParcelStatus.MANIFESTED);
                manifest.addParcel(parcel);
            }
        }

        manifest.setExpectedParcelCount(countActiveManifestParcels(manifest));
        if (manifest.getAssignedCourier() != null) {
            support.validateVehicleWeightCapacity(manifest.getAssignedCourier(), computeActiveWeightKg(manifest));
        }

        return manifestRepository.save(manifest);
    }

    private ParcelCandidate resolveEligibleParcelCandidate(TransferManifest manifest, String rawKey) {
        String key = rawKey.trim();
        PickupTask pickupTask = pickupTaskRepository.findByOrderId(key)
                .or(() -> pickupTaskRepository.findByTrackingNumberIgnoreCase(key))
                .or(() -> pickupTaskRepository.findByTaskCodeIgnoreCase(key))
                .orElse(null);

        OrderSummaryDto orderSummary = support.fetchOrderQuietly(
                pickupTask != null ? pickupTask.getOrderId() : key
        );

        if (pickupTask == null && orderSummary == null) {
            throw new ResourceNotFoundException("Parcel / Order not found: " + key);
        }

        String orderId = support.firstNonBlank(
                pickupTask != null ? pickupTask.getOrderId() : null,
                orderSummary != null ? orderSummary.resolvedOrderId() : null
        );
        String trackingNumber = support.firstNonBlank(
                pickupTask != null ? pickupTask.getTrackingNumber() : null,
                orderSummary != null ? orderSummary.getTrackingNumber() : null,
                orderId
        );

        Long parcelOriginId = pickupTask != null && pickupTask.getOriginBranchId() != null
                ? pickupTask.getOriginBranchId()
                : (orderSummary != null ? orderSummary.getOriginBranchId() : null);
        String parcelOriginCode = support.firstNonBlank(
                pickupTask != null ? pickupTask.getOriginBranchCode() : null,
                orderSummary != null ? orderSummary.getOriginBranchCode() : null
        );
        String parcelOriginName = support.firstNonBlank(
                pickupTask != null ? pickupTask.getOriginBranchName() : null,
                orderSummary != null ? orderSummary.getOriginBranchName() : null
        );

        Long parcelDestId = pickupTask != null && pickupTask.getDestinationBranchId() != null
                ? pickupTask.getDestinationBranchId()
                : (orderSummary != null ? orderSummary.getDestinationBranchId() : null);
        String parcelDestCode = support.firstNonBlank(
                pickupTask != null ? pickupTask.getDestinationBranchCode() : null,
                orderSummary != null ? orderSummary.getDestinationBranchCode() : null
        );
        String parcelDestName = support.firstNonBlank(
                pickupTask != null ? pickupTask.getDestinationBranchName() : null,
                orderSummary != null ? orderSummary.getDestinationBranchName() : null
        );

        boolean sameBranch = (pickupTask != null && pickupTask.isSameBranch())
                || (orderSummary != null && Boolean.TRUE.equals(orderSummary.getSameBranch()))
                || (parcelOriginId != null && Objects.equals(parcelOriginId, parcelDestId));
        if (sameBranch) {
            throw new DispatchValidationException(
                    "SAME_BRANCH_PARCEL_NOT_ELIGIBLE",
                    "Parcel " + trackingNumber + " is a same-branch delivery and does not require inter-branch transfer"
            );
        }

        if (!Objects.equals(parcelOriginId, manifest.getOriginBranchId())
                || !Objects.equals(parcelDestId, manifest.getDestinationBranchId())) {
            throw new DispatchValidationException(
                    "BRANCH_ROUTE_MISMATCH",
                    "Parcel " + trackingNumber + " route (" + parcelOriginId + " -> " + parcelDestId
                            + ") does not match manifest route (" + manifest.getOriginBranchId()
                            + " -> " + manifest.getDestinationBranchId() + ")"
            );
        }

        if (pickupTask != null) {
            if (pickupTask.getStatus() != PickupTaskStatus.PICKED_UP
                    && pickupTask.getStatus() != PickupTaskStatus.BRANCH_RECEIVED) {
                throw new DispatchValidationException(
                        "PARCEL_NOT_READY_FOR_TRANSFER",
                        "Parcel " + trackingNumber + " is not ready for transfer (pickup task status: " + pickupTask.getStatus() + ")"
                );
            }
        } else {
            String orderStatus = orderSummary.getStatus() != null ? orderSummary.getStatus().toUpperCase() : "";
            if (!"PICKED_UP".equals(orderStatus) && !"AT_ORIGIN_BRANCH".equals(orderStatus)) {
                throw new DispatchValidationException(
                        "PARCEL_NOT_READY_FOR_TRANSFER",
                        "Parcel " + trackingNumber + " is not ready for transfer (order status: " + orderStatus + ")"
                );
            }
        }

        if (orderSummary != null && orderSummary.getStatus() != null
                && TERMINAL_OR_INVALID_ORDER_STATUSES.contains(orderSummary.getStatus().toUpperCase())) {
            throw new DispatchValidationException(
                    "PARCEL_NOT_READY_FOR_TRANSFER",
                    "Parcel " + trackingNumber + " has terminal/RTS status " + orderSummary.getStatus()
            );
        }

        if (deliveryJobRepository.existsByOrderId(orderId)) {
            throw new DispatchValidationException(
                    "PARCEL_ALREADY_AT_DESTINATION_OR_TERMINAL",
                    "Parcel " + trackingNumber + " already has a destination delivery job"
            );
        }

        BigDecimal weightKg = pickupTask != null && pickupTask.getWeightKg() != null
                ? pickupTask.getWeightKg()
                : (orderSummary != null && orderSummary.getWeightKg() != null ? orderSummary.getWeightKg() : BigDecimal.ONE);
        String parcelCategory = support.firstNonBlank(
                pickupTask != null ? pickupTask.getParcelCategory() : null,
                orderSummary != null ? orderSummary.getParcelDescription() : null,
                "Parcel"
        );

        return new ParcelCandidate(
                pickupTask != null ? pickupTask.getId() : null,
                orderId,
                trackingNumber,
                parcelOriginCode,
                parcelOriginName,
                parcelDestCode,
                parcelDestName,
                weightKg,
                parcelCategory
        );
    }

    private void enrichDefaultBranchNames(TransferManifest manifest, ParcelCandidate candidate) {
        if (candidate.originBranchCode() != null && manifest.getOriginBranchCode().startsWith("BR-")) {
            manifest.setOriginBranchCode(candidate.originBranchCode());
        }
        if (candidate.originBranchName() != null && manifest.getOriginBranchName().startsWith("Branch ")) {
            manifest.setOriginBranchName(candidate.originBranchName());
        }
        if (candidate.destinationBranchCode() != null && manifest.getDestinationBranchCode().startsWith("BR-")) {
            manifest.setDestinationBranchCode(candidate.destinationBranchCode());
        }
        if (candidate.destinationBranchName() != null && manifest.getDestinationBranchName().startsWith("Branch ")) {
            manifest.setDestinationBranchName(candidate.destinationBranchName());
        }
    }

    private Map<String, ReceiptClassification> classifyManifestParcels(
            List<TransferManifestParcel> dispatchedParcels,
            ReceiveManifestRequest request) {
        Map<String, ReceiptClassification> results = new LinkedHashMap<>();

        boolean hasVerificationList = request.getParcelVerifications() != null && !request.getParcelVerifications().isEmpty();
        boolean hasExplicitReceived = request.getReceivedOrderIds() != null && !request.getReceivedOrderIds().isEmpty();

        Map<String, TransferManifestParcel> parcelByKey = new HashMap<>();
        for (TransferManifestParcel p : dispatchedParcels) {
            parcelByKey.put(p.getOrderId().toLowerCase(), p);
            parcelByKey.put(p.getTrackingNumber().toLowerCase(), p);
        }

        if (hasVerificationList) {
            for (ReceiveManifestRequest.ParcelVerificationItem item : request.getParcelVerifications()) {
                TransferManifestParcel match = resolveManifestParcelKey(parcelByKey, item.getParcelKey());
                ManifestParcelStatus status = parseReceiptStatus(item.getStatus());
                results.put(match.getOrderId(), new ReceiptClassification(status, item.getDiscrepancyNotes(), item.getEvidenceReference()));
            }
        }

        if (request.getDamagedParcels() != null) {
            for (ReceiveManifestRequest.ParcelConditionItem damaged : request.getDamagedParcels()) {
                TransferManifestParcel match = resolveManifestParcelKey(parcelByKey, damaged.getParcelKey());
                results.put(match.getOrderId(), new ReceiptClassification(
                        ManifestParcelStatus.DAMAGED,
                        damaged.getDiscrepancyNotes(),
                        damaged.getEvidenceReference()
                ));
            }
        }

        if (request.getMissingOrderIds() != null) {
            for (String missingKey : request.getMissingOrderIds()) {
                TransferManifestParcel match = resolveManifestParcelKey(parcelByKey, missingKey);
                results.put(match.getOrderId(), new ReceiptClassification(ManifestParcelStatus.MISSING, null, null));
            }
        }

        if (request.getReceivedOrderIds() != null) {
            for (String recKey : request.getReceivedOrderIds()) {
                TransferManifestParcel match = resolveManifestParcelKey(parcelByKey, recKey);
                results.putIfAbsent(match.getOrderId(), new ReceiptClassification(ManifestParcelStatus.RECEIVED, null, null));
            }
        }

        for (TransferManifestParcel parcel : dispatchedParcels) {
            if (!results.containsKey(parcel.getOrderId())) {
                ManifestParcelStatus defaultStatus = (hasVerificationList || hasExplicitReceived)
                        ? ManifestParcelStatus.MISSING
                        : ManifestParcelStatus.RECEIVED;
                results.put(parcel.getOrderId(), new ReceiptClassification(defaultStatus, null, null));
            }
        }

        return results;
    }

    private TransferManifestParcel resolveManifestParcelKey(Map<String, TransferManifestParcel> parcelByKey, String key) {
        if (key == null || key.isBlank()) {
            throw new DispatchValidationException("PARCEL_KEY_REQUIRED", "Parcel key cannot be blank in receipt verification");
        }
        TransferManifestParcel found = parcelByKey.get(key.trim().toLowerCase());
        if (found == null) {
            throw new DispatchValidationException("PARCEL_NOT_IN_MANIFEST", "Parcel " + key + " is not part of this manifest");
        }
        return found;
    }

    private ManifestParcelStatus parseReceiptStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return ManifestParcelStatus.RECEIVED;
        }
        String normalized = raw.trim().toUpperCase();
        return switch (normalized) {
            case "RECEIVED" -> ManifestParcelStatus.RECEIVED;
            case "MISSING" -> ManifestParcelStatus.MISSING;
            case "DAMAGED" -> ManifestParcelStatus.DAMAGED;
            default -> throw new IllegalArgumentException("Unsupported manifest receipt parcel status: " + raw);
        };
    }

    private Long resolveOriginBranchIdForCreate(CreateTransferManifestRequest request, DispatchUserPrincipal principal) {
        if (principal.isDispatcher() && !principal.isAdmin()) {
            if (principal.branchId() == null) {
                throw new AccessDeniedException("Branch-scoped staff must have an assigned branchId claim");
            }
            if (request.getOriginBranchId() != null && !Objects.equals(principal.branchId(), request.getOriginBranchId())) {
                throw new AccessDeniedException(
                        "Dispatcher for branch " + principal.branchId() + " cannot create manifest from branch " + request.getOriginBranchId()
                );
            }
            return principal.branchId();
        }
        if (request.getOriginBranchId() != null) {
            return request.getOriginBranchId();
        }
        return principal.branchId();
    }

    private void authorizeDepartureActor(DispatchUserPrincipal principal, TransferManifest manifest) {
        if (principal.isAdmin()) {
            return;
        }
        if (principal.isDispatcher()) {
            support.enforceBranchAccess(principal, manifest.getOriginBranchId(), "depart transfer manifest");
            return;
        }
        CourierProfileEntity courier = support.resolveCurrentCourier(principal);
        if (manifest.getAssignedCourier() == null
                || !Objects.equals(manifest.getAssignedCourier().getId(), courier.getId())) {
            throw new AccessDeniedException("Only origin branch dispatcher, admin, or assigned courier can confirm departure");
        }
    }

    private void authorizeManifestViewer(DispatchUserPrincipal principal, TransferManifest manifest) {
        if (principal.isAdmin()) {
            return;
        }
        if (principal.isDispatcher()) {
            if (principal.branchId() == null) {
                return;
            }
            boolean matches = Objects.equals(principal.branchId(), manifest.getOriginBranchId())
                    || Objects.equals(principal.branchId(), manifest.getDestinationBranchId());
            if (!matches) {
                throw new AccessDeniedException("Dispatcher is not authorized to view manifest " + manifest.getManifestCode());
            }
            return;
        }
        CourierProfileEntity courier = support.resolveCurrentCourier(principal);
        if (manifest.getAssignedCourier() == null
                || !Objects.equals(manifest.getAssignedCourier().getId(), courier.getId())) {
            throw new AccessDeniedException("Courier is not assigned to manifest " + manifest.getManifestCode());
        }
    }

    private TransferManifest findManifest(String manifestIdOrCode) {
        if (manifestIdOrCode == null || manifestIdOrCode.isBlank()) {
            throw new DispatchValidationException("MANIFEST_ID_REQUIRED", "Manifest identifier is required");
        }
        String key = manifestIdOrCode.trim();
        if (key.chars().allMatch(Character::isDigit)) {
            return manifestRepository.findById(Long.parseLong(key))
                    .orElseThrow(() -> new ResourceNotFoundException("Transfer manifest", Long.parseLong(key)));
        }
        return manifestRepository.findByManifestCodeIgnoreCase(key)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer manifest not found: " + key));
    }

    private Optional<TransferManifestParcel> findParcelOnManifest(TransferManifest manifest, String parcelKey) {
        String key = parcelKey.trim();
        return manifest.getParcels().stream()
                .filter(p -> p.getOrderId().equalsIgnoreCase(key)
                        || p.getTrackingNumber().equalsIgnoreCase(key)
                        || String.valueOf(p.getId()).equals(key))
                .findFirst();
    }

    private int countActiveManifestParcels(TransferManifest manifest) {
        return (int) manifest.getParcels().stream()
                .filter(p -> p.getStatus() != ManifestParcelStatus.REMOVED)
                .count();
    }

    private BigDecimal computeActiveWeightKg(TransferManifest manifest) {
        return manifest.getParcels().stream()
                .filter(p -> p.getStatus() != ManifestParcelStatus.REMOVED)
                .map(p -> p.getWeightKg() != null ? p.getWeightKg() : BigDecimal.ONE)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private ReadyForTransferParcelDto toReadyParcelDto(PickupTask task) {
        ReadyForTransferParcelDto dto = new ReadyForTransferParcelDto();
        dto.setPickupTaskId(task.getId());
        dto.setTaskCode(task.getTaskCode());
        dto.setOrderId(task.getOrderId());
        dto.setTrackingNumber(task.getTrackingNumber());
        dto.setParcelReference(task.getTrackingNumber());
        dto.setOriginBranchId(task.getOriginBranchId());
        dto.setOriginBranchCode(task.getOriginBranchCode());
        dto.setOriginBranchName(task.getOriginBranchName());
        dto.setDestinationBranchId(task.getDestinationBranchId());
        dto.setDestinationBranchCode(task.getDestinationBranchCode());
        dto.setDestinationBranchName(task.getDestinationBranchName());
        dto.setParcelCategory(task.getParcelCategory());
        dto.setWeightKg(task.getWeightKg());
        dto.setPriority(task.getPriority() != null ? task.getPriority().name() : DeliveryPriority.NORMAL.name());
        LocalDateTime readyTime = task.getBranchConfirmedAt() != null
                ? task.getBranchConfirmedAt()
                : (task.getPickedUpAt() != null ? task.getPickedUpAt() : task.getCreatedAt());
        dto.setReadySince(readyTime != null ? readyTime.format(DispatchSupportService.ISO_FORMAT) : null);
        return dto;
    }

    private TransferManifestDto toManifestDto(TransferManifest manifest) {
        TransferManifestDto dto = new TransferManifestDto();
        dto.setId(manifest.getId());
        dto.setManifestCode(manifest.getManifestCode());
        dto.setOriginBranchId(manifest.getOriginBranchId());
        dto.setOriginBranchCode(manifest.getOriginBranchCode());
        dto.setOriginBranchName(manifest.getOriginBranchName());
        dto.setDestinationBranchId(manifest.getDestinationBranchId());
        dto.setDestinationBranchCode(manifest.getDestinationBranchCode());
        dto.setDestinationBranchName(manifest.getDestinationBranchName());
        dto.setStatus(manifest.getStatus().name());
        if (manifest.getAssignedCourier() != null) {
            dto.setAssignedCourierId(String.valueOf(manifest.getAssignedCourier().getId()));
        }
        dto.setAssignedCourierCode(manifest.getAssignedCourierCode());
        dto.setAssignedCourierName(manifest.getAssignedCourierName());
        dto.setVehicleType(manifest.getVehicleType());
        dto.setVehiclePlate(manifest.getVehiclePlate());
        dto.setExpectedParcelCount(manifest.getExpectedParcelCount());
        dto.setReceivedParcelCount(manifest.getReceivedParcelCount());
        dto.setMissingParcelCount(manifest.getMissingParcelCount());
        dto.setDamagedParcelCount(manifest.getDamagedParcelCount());
        dto.setOriginHandoverById(manifest.getOriginHandoverById());
        dto.setOriginHandoverByName(manifest.getOriginHandoverByName());
        dto.setOriginHandoverAt(manifest.getOriginHandoverAt() != null ? manifest.getOriginHandoverAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setDepartureAt(manifest.getDepartureAt() != null ? manifest.getDepartureAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setArrivalAt(manifest.getArrivalAt() != null ? manifest.getArrivalAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setDestinationReceivedById(manifest.getDestinationReceivedById());
        dto.setDestinationReceivedByName(manifest.getDestinationReceivedByName());
        dto.setDestinationReceivedAt(manifest.getDestinationReceivedAt() != null ? manifest.getDestinationReceivedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setCompletedAt(manifest.getCompletedAt() != null ? manifest.getCompletedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setNotes(manifest.getNotes());
        dto.setDiscrepancyNotes(manifest.getDiscrepancyNotes());
        dto.setCreatedById(manifest.getCreatedById());
        dto.setCreatedByName(manifest.getCreatedByName());
        dto.setCreatedAt(manifest.getCreatedAt() != null ? manifest.getCreatedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        dto.setParcels(manifest.getParcels().stream().map(this::toParcelItemDto).toList());
        if (manifest.getId() != null) {
            dto.setCustodyRecords(custodyTrackingService.getManifestCustodyDtos(manifest.getId()));
        }
        return dto;
    }

    private TransferManifestDto.TransferParcelItemDto toParcelItemDto(TransferManifestParcel parcel) {
        TransferManifestDto.TransferParcelItemDto item = new TransferManifestDto.TransferParcelItemDto();
        item.setId(parcel.getId());
        item.setPickupTaskId(parcel.getPickupTaskId());
        item.setOrderId(parcel.getOrderId());
        item.setTrackingNumber(parcel.getTrackingNumber());
        item.setParcelReference(parcel.getParcelReference());
        item.setWeightKg(parcel.getWeightKg());
        item.setParcelCategory(parcel.getParcelCategory());
        item.setStatus(parcel.getStatus().name());
        item.setDiscrepancyNotes(parcel.getDiscrepancyNotes());
        item.setAddedAt(parcel.getAddedAt() != null ? parcel.getAddedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        item.setDispatchedAt(parcel.getDispatchedAt() != null ? parcel.getDispatchedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        item.setReceivedAt(parcel.getReceivedAt() != null ? parcel.getReceivedAt().format(DispatchSupportService.ISO_FORMAT) : null);
        return item;
    }

    private record ParcelCandidate(
            Long pickupTaskId,
            String orderId,
            String trackingNumber,
            String originBranchCode,
            String originBranchName,
            String destinationBranchCode,
            String destinationBranchName,
            BigDecimal weightKg,
            String parcelCategory
    ) {
    }

    private record ReceiptClassification(
            ManifestParcelStatus status,
            String notes,
            String evidenceReference
    ) {
    }
}
