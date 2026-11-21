package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.client.OrderStatusTransitionPayload;
import com.swiftdrop.dispatch.client.OrderSummaryDto;
import com.swiftdrop.dispatch.dto.CustodyRecordDto;
import com.swiftdrop.dispatch.dto.DeliveryExceptionDto;
import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.*;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Predicate;

@Service
public class DispatchSupportService {

    private static final Logger log = LoggerFactory.getLogger(DispatchSupportService.class);
    public static final DateTimeFormatter ISO_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private static final List<AssignmentStatus> ACTIVE_WORKLOAD_STATUSES = List.of(
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.IN_TRANSIT,
            AssignmentStatus.REASSIGNED
    );

    private final CourierProfileRepository courierRepository;
    private final CourierAssignmentRepository assignmentRepository;
    private final DeliveryJobRepository deliveryJobRepository;
    private final PickupTaskRepository pickupTaskRepository;
    private final OrderServiceClient orderServiceClient;
    private final DispatchEventPublisher eventPublisher;

    public DispatchSupportService(
            CourierProfileRepository courierRepository,
            CourierAssignmentRepository assignmentRepository,
            DeliveryJobRepository deliveryJobRepository,
            PickupTaskRepository pickupTaskRepository,
            OrderServiceClient orderServiceClient,
            DispatchEventPublisher eventPublisher) {
        this.courierRepository = courierRepository;
        this.assignmentRepository = assignmentRepository;
        this.deliveryJobRepository = deliveryJobRepository;
        this.pickupTaskRepository = pickupTaskRepository;
        this.orderServiceClient = orderServiceClient;
        this.eventPublisher = eventPublisher;
    }

    public DispatchUserPrincipal requirePrincipal(DispatchUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        return principal;
    }

    public void requireDispatcherOrAdmin(DispatchUserPrincipal principal) {
        requirePrincipal(principal);
        if (!principal.isAdmin() && !principal.isDispatcher()) {
            throw new AccessDeniedException("Dispatcher or admin role is required for this operation");
        }
    }

    public void requireOperationalStaff(DispatchUserPrincipal principal) {
        requirePrincipal(principal);
        if (!principal.isAdmin() && !principal.isDispatcher() && !principal.isCourier()) {
            throw new AccessDeniedException("Operational staff role (ADMIN, DISPATCHER, or COURIER) is required");
        }
    }

    public void enforceBranchAccess(DispatchUserPrincipal principal, Long targetBranchId, String operation) {
        requireDispatcherOrAdmin(principal);
        if (principal.isAdmin()) {
            return;
        }
        if (!principal.canManageBranch(targetBranchId)) {
            throw new AccessDeniedException(
                    "Dispatcher for branch " + principal.branchId()
                            + " is not authorized to " + operation + " for branch " + targetBranchId
            );
        }
    }

    public Long resolveScopedBranchId(DispatchUserPrincipal principal, Long requestedBranchId) {
        requireDispatcherOrAdmin(principal);
        if (principal.isAdmin()) {
            return requestedBranchId;
        }
        Long dispatcherBranchId = principal.branchId();
        if (dispatcherBranchId == null) {
            throw new AccessDeniedException("Branch-scoped staff must have an assigned branchId claim");
        }
        if (requestedBranchId != null && !dispatcherBranchId.equals(requestedBranchId)) {
            throw new AccessDeniedException("Dispatcher cannot query data for branch " + requestedBranchId);
        }
        return dispatcherBranchId;
    }

    public CourierProfileEntity resolveCourier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new DispatchValidationException("COURIER_IDENTIFIER_REQUIRED", "Courier identifier is required");
        }
        String trimmed = identifier.trim();
        if (trimmed.chars().allMatch(Character::isDigit)) {
            Optional<CourierProfileEntity> byId = courierRepository.findById(Long.parseLong(trimmed));
            if (byId.isPresent()) {
                return byId.get();
            }
        }
        return courierRepository.findByCourierCodeIgnoreCase(trimmed)
                .or(() -> courierRepository.findByUserId(trimmed))
                .or(() -> courierRepository.findByEmailIgnoreCase(trimmed))
                .orElseThrow(() -> new ResourceNotFoundException("Courier not found: " + identifier));
    }

    public CourierProfileEntity resolveCurrentCourier(DispatchUserPrincipal principal) {
        requirePrincipal(principal);
        if (principal.userId() != null) {
            Optional<CourierProfileEntity> byUserId = courierRepository.findByUserId(principal.userId());
            if (byUserId.isPresent()) {
                return byUserId.get();
            }
        }
        if (principal.email() != null) {
            Optional<CourierProfileEntity> byEmail = courierRepository.findByEmailIgnoreCase(principal.email());
            if (byEmail.isPresent()) {
                return byEmail.get();
            }
        }
        throw new ResourceNotFoundException("No courier profile linked to authenticated user: " + actorName(principal));
    }

    public long countActiveWorkload(Long courierId) {
        return assignmentRepository.countByCourierIdAndStatusIn(courierId, ACTIVE_WORKLOAD_STATUSES);
    }

    public BigDecimal maxWeightForVehicle(VehicleType vehicleType) {
        if (vehicleType == null) {
            return new BigDecimal("20.00");
        }
        return switch (vehicleType) {
            case BICYCLE -> new BigDecimal("5.00");
            case MOTORCYCLE -> new BigDecimal("20.00");
            case VAN -> new BigDecimal("150.00");
        };
    }

    public void validateCourierEligibility(
            CourierProfileEntity courier,
            Long requiredBranchId,
            BigDecimal totalWeightKg) {
        if (courier.getAvailabilityStatus() == CourierAvailabilityStatus.OFFLINE
                || courier.getAvailabilityStatus() == CourierAvailabilityStatus.ON_BREAK) {
            throw new DispatchValidationException(
                    "COURIER_UNAVAILABLE",
                    "Courier " + courier.getName() + " is currently " + courier.getAvailabilityStatus()
            );
        }
        if (requiredBranchId != null
                && courier.getBranchId() != null
                && !Objects.equals(requiredBranchId, courier.getBranchId())) {
            throw new DispatchValidationException(
                    "BRANCH_MISMATCH",
                    "Courier " + courier.getName() + " belongs to branch " + courier.getBranchName()
                            + ", not required branch " + requiredBranchId
            );
        }
        long activeCount = countActiveWorkload(courier.getId());
        if (activeCount >= courier.getMaxCapacity()) {
            throw new DispatchValidationException(
                    "COURIER_AT_CAPACITY",
                    "Courier " + courier.getName() + " has reached maximum active capacity (" + courier.getMaxCapacity() + ")"
            );
        }
        validateVehicleWeightCapacity(courier, totalWeightKg);
    }

    public void validateVehicleWeightCapacity(CourierProfileEntity courier, BigDecimal totalWeightKg) {
        if (courier == null || totalWeightKg == null) {
            return;
        }
        BigDecimal maxWeight = maxWeightForVehicle(courier.getVehicleType());
        if (totalWeightKg.compareTo(maxWeight) > 0) {
            throw new DispatchValidationException(
                    "VEHICLE_WEIGHT_EXCEEDED",
                    "Total parcel weight " + totalWeightKg + "kg exceeds "
                            + courier.getVehicleType().getDisplayName() + " vehicle capacity (" + maxWeight + "kg)"
            );
        }
    }

    public void refreshCourierAvailabilityStatus(CourierProfileEntity courier) {
        if (courier == null) {
            return;
        }
        if (courier.getAvailabilityStatus() == CourierAvailabilityStatus.OFFLINE
                || courier.getAvailabilityStatus() == CourierAvailabilityStatus.ON_BREAK) {
            courierRepository.save(courier);
            return;
        }
        long activeCount = countActiveWorkload(courier.getId());
        if (activeCount >= courier.getMaxCapacity()) {
            courier.setAvailabilityStatus(CourierAvailabilityStatus.BUSY);
        } else if (courier.getAvailabilityStatus() == CourierAvailabilityStatus.BUSY) {
            courier.setAvailabilityStatus(CourierAvailabilityStatus.AVAILABLE);
        }
        courierRepository.save(courier);
    }

    public void deactivateActiveAssignments(
            List<CourierAssignment> existingAssignments,
            AssignmentStatus targetStatus,
            String reason) {
        if (existingAssignments == null) {
            return;
        }
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        Set<CourierProfileEntity> touchedCouriers = new HashSet<>();
        for (CourierAssignment assignment : existingAssignments) {
            if (assignment.getStatus() != null && assignment.getStatus().isActiveWorkload()) {
                assignment.setStatus(targetStatus);
                String trimmedReason = blankToNull(reason);
                if (trimmedReason != null) {
                    assignment.setNotes(assignment.getNotes() != null && !assignment.getNotes().isBlank()
                            ? assignment.getNotes() + " | " + trimmedReason
                            : trimmedReason);
                }
                if (targetStatus == AssignmentStatus.DELIVERED || targetStatus == AssignmentStatus.CANCELLED) {
                    assignment.setCompletedAt(now);
                }
                assignmentRepository.save(assignment);
                if (assignment.getCourier() != null) {
                    touchedCouriers.add(assignment.getCourier());
                }
            }
        }
        touchedCouriers.forEach(this::refreshCourierAvailabilityStatus);
    }

    public String generateUniqueCode(String prefix, Predicate<String> existsChecker) {
        for (int i = 0; i < 12; i++) {
            String candidate = prefix + "-" + UUID.randomUUID().toString()
                    .replace("-", "")
                    .substring(0, 6)
                    .toUpperCase();
            if (!existsChecker.test(candidate)) {
                return candidate;
            }
        }
        return prefix + "-" + Long.toHexString(System.nanoTime()).toUpperCase();
    }

    public OrderSummaryDto fetchOrderQuietly(String orderIdOrTracking) {
        if (orderIdOrTracking == null || orderIdOrTracking.isBlank()) {
            return null;
        }
        try {
            return orderServiceClient.getOrderByIdOrTracking(orderIdOrTracking.trim());
        } catch (ResourceNotFoundException ex) {
            return null;
        } catch (Exception ex) {
            log.debug("Order lookup fallback for {}: {}", orderIdOrTracking, ex.getMessage());
            return null;
        }
    }

    public void notifyOrderStatus(
            String orderId,
            String status,
            String location,
            String details,
            DispatchUserPrincipal principal) {
        if (orderId == null || orderId.isBlank()) {
            return;
        }
        OrderStatusTransitionPayload payload = new OrderStatusTransitionPayload(status, location, details);
        String actorId = principal != null ? principal.userId() : "dispatch-system";
        String role = principal != null ? actorRole(principal) : "DISPATCHER";
        orderServiceClient.notifyStatusTransition(orderId, payload, actorId, role);
    }

    public void publishEventSafely(String routingKey, String eventType, Map<String, Object> rawDetails) {
        Map<String, Object> clean = new LinkedHashMap<>();
        if (rawDetails != null) {
            rawDetails.forEach((k, v) -> {
                if (v != null) {
                    clean.put(k, v);
                }
            });
        }
        eventPublisher.publishEvent(routingKey, eventType, clean);
    }

    public DeliveryJob ensureDestinationDeliveryJob(
            TransferManifest manifest,
            TransferManifestParcel parcel,
            PickupTask pickupTask,
            OrderSummaryDto orderSummary) {
        Optional<DeliveryJob> existing = deliveryJobRepository.findByOrderId(parcel.getOrderId())
                .or(() -> deliveryJobRepository.findByTrackingNumberIgnoreCase(parcel.getTrackingNumber()));
        if (existing.isPresent()) {
            return existing.get();
        }

        DeliveryJob job = new DeliveryJob();
        job.setJobCode(generateUniqueCode("JOB", code -> deliveryJobRepository.findByJobCodeIgnoreCase(code).isPresent()));
        job.setOrderId(parcel.getOrderId());
        job.setTrackingNumber(parcel.getTrackingNumber());
        job.setBranchId(manifest.getDestinationBranchId());
        job.setBranchCode(manifest.getDestinationBranchCode());
        job.setBranchName(manifest.getDestinationBranchName());
        job.setOriginBranchId(pickupTask != null && pickupTask.getOriginBranchId() != null
                ? pickupTask.getOriginBranchId()
                : (orderSummary != null && orderSummary.getOriginBranchId() != null
                        ? orderSummary.getOriginBranchId()
                        : manifest.getOriginBranchId()));
        job.setOriginBranchCode(firstNonBlank(
                pickupTask != null ? pickupTask.getOriginBranchCode() : null,
                orderSummary != null ? orderSummary.getOriginBranchCode() : null,
                manifest.getOriginBranchCode()
        ));
        job.setOriginBranchName(firstNonBlank(
                pickupTask != null ? pickupTask.getOriginBranchName() : null,
                orderSummary != null ? orderSummary.getOriginBranchName() : null,
                manifest.getOriginBranchName()
        ));
        job.setDestinationBranchId(manifest.getDestinationBranchId());
        job.setDestinationBranchCode(manifest.getDestinationBranchCode());
        job.setDestinationBranchName(manifest.getDestinationBranchName());

        String senderName = firstNonBlank(
                orderSummary != null ? orderSummary.getPickupContactName() : null,
                pickupTask != null ? pickupTask.getSenderName() : null,
                manifest.getOriginBranchName()
        );
        String senderPhone = firstNonBlank(
                orderSummary != null ? orderSummary.getPickupContactPhone() : null,
                pickupTask != null ? pickupTask.getSenderPhone() : null,
                "N/A"
        );
        String pickupAddress = firstNonBlank(
                orderSummary != null ? orderSummary.getPickupAddress() : null,
                pickupTask != null ? pickupTask.getPickupAddress() : null,
                manifest.getOriginBranchName()
        );
        String recipientName = firstNonBlank(
                orderSummary != null ? orderSummary.getDropoffContactName() : null,
                pickupTask != null ? pickupTask.getRecipientName() : null,
                "Recipient"
        );
        String recipientPhone = firstNonBlank(
                orderSummary != null ? orderSummary.getDropoffContactPhone() : null,
                pickupTask != null ? pickupTask.getRecipientPhone() : null,
                "N/A"
        );
        String deliveryAddress = firstNonBlank(
                orderSummary != null ? orderSummary.getDropoffAddress() : null,
                pickupTask != null ? pickupTask.getDropoffAddress() : null,
                manifest.getDestinationBranchName() + " Service Area"
        );
        String paymentMethod = firstNonBlank(
                orderSummary != null ? orderSummary.getPaymentMethod() : null,
                pickupTask != null ? pickupTask.getPaymentMethod() : null,
                "PREPAID"
        );
        BigDecimal codAmount = orderSummary != null && orderSummary.getCodAmount() != null
                ? orderSummary.getCodAmount()
                : (pickupTask != null && pickupTask.getCodAmount() != null ? pickupTask.getCodAmount() : BigDecimal.ZERO);
        BigDecimal weightKg = parcel.getWeightKg() != null
                ? parcel.getWeightKg()
                : (orderSummary != null && orderSummary.getWeightKg() != null ? orderSummary.getWeightKg() : BigDecimal.ONE);
        String category = firstNonBlank(
                parcel.getParcelCategory(),
                orderSummary != null ? orderSummary.getParcelDescription() : null,
                "Parcel"
        );
        DeliveryPriority priority = pickupTask != null && pickupTask.getPriority() != null
                ? pickupTask.getPriority()
                : DeliveryPriority.NORMAL;

        job.setSenderName(senderName);
        job.setSenderPhone(senderPhone);
        job.setPickupAddress(pickupAddress);
        job.setRecipientName(recipientName);
        job.setRecipientPhone(recipientPhone);
        job.setDeliveryAddress(deliveryAddress);
        job.setPaymentMethod(paymentMethod);
        job.setCodAmount(codAmount);
        job.setWeightKg(weightKg);
        job.setParcelCategory(category);
        job.setPriority(priority);
        job.setHandlingNotes(firstNonBlank(
                orderSummary != null ? orderSummary.getDeliveryInstructions() : null,
                pickupTask != null ? pickupTask.getHandlingNotes() : null
        ));
        job.setStatus(DeliveryJobStatus.UNASSIGNED);
        return deliveryJobRepository.save(job);
    }

    public CustodyRecordDto toCustodyRecordDto(ParcelCustodyRecord rec) {
        CustodyRecordDto dto = new CustodyRecordDto();
        dto.setId(rec.getId());
        dto.setCustodyCode(rec.getCustodyCode());
        dto.setOrderId(rec.getOrderId());
        dto.setTrackingNumber(rec.getTrackingNumber());
        dto.setParcelReference(rec.getParcelReference());
        dto.setManifestId(rec.getManifestId());
        dto.setManifestReference(rec.getManifestReference());
        dto.setReturnTaskId(rec.getReturnTaskId());
        dto.setEventType(rec.getEventType().name());
        dto.setResponsibleBranchId(rec.getResponsibleBranchId());
        dto.setResponsibleBranchCode(rec.getResponsibleBranchCode());
        dto.setResponsibleBranchName(rec.getResponsibleBranchName());
        dto.setResponsibleCourierId(rec.getResponsibleCourierId());
        dto.setResponsibleCourierCode(rec.getResponsibleCourierCode());
        dto.setResponsibleCourierName(rec.getResponsibleCourierName());
        dto.setResponsibleEmployeeId(rec.getResponsibleEmployeeId());
        dto.setResponsibleEmployeeName(rec.getResponsibleEmployeeName());
        dto.setHandoverTimestamp(rec.getHandoverTimestamp() != null ? rec.getHandoverTimestamp().format(ISO_FORMAT) : null);
        dto.setDiscrepancyNotes(rec.getDiscrepancyNotes());
        dto.setNotes(rec.getNotes());
        return dto;
    }

    public DeliveryExceptionDto toDeliveryExceptionDto(DeliveryException ex) {
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
        dto.setExceptionType(ex.getExceptionType().name());
        dto.setStatus(ex.getStatus().name());
        dto.setFailedAttemptCount(ex.getFailedAttemptCount());
        dto.setLastFailureReason(ex.getLastFailureReason());
        dto.setDecisionAction(ex.getDecisionAction() != null ? ex.getDecisionAction().name() : null);
        dto.setDecisionReason(ex.getDecisionReason());
        dto.setDecidedById(ex.getDecidedById());
        dto.setDecidedByName(ex.getDecidedByName());
        dto.setDecidedByRole(ex.getDecidedByRole());
        dto.setDecidedAt(ex.getDecidedAt() != null ? ex.getDecidedAt().format(ISO_FORMAT) : null);
        dto.setCreatedAt(ex.getCreatedAt() != null ? ex.getCreatedAt().format(ISO_FORMAT) : null);
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
        dto.setReportedAt(ex.getReportedAt() != null ? ex.getReportedAt().format(ISO_FORMAT) : null);
        dto.setResolutionNotes(ex.getResolutionNotes());
        return dto;
    }

    public List<String> collectDistinctKeys(List<String>... sources) {
        LinkedHashSet<String> keys = new LinkedHashSet<>();
        if (sources != null) {
            for (List<String> list : sources) {
                if (list != null) {
                    for (String item : list) {
                        if (item != null && !item.isBlank()) {
                            keys.add(item.trim());
                        }
                    }
                }
            }
        }
        return new ArrayList<>(keys);
    }

    public String actorName(DispatchUserPrincipal principal) {
        if (principal == null) {
            return "System";
        }
        if (principal.email() != null && !principal.email().isBlank()) {
            return principal.email();
        }
        return principal.userId() != null ? principal.userId() : "System";
    }

    public String actorRole(DispatchUserPrincipal principal) {
        if (principal == null) {
            return "SYSTEM";
        }
        if (principal.isAdmin()) {
            return "ADMIN";
        }
        if (principal.isDispatcher()) {
            return "DISPATCHER";
        }
        if (principal.isCourier()) {
            return "COURIER";
        }
        return "SYSTEM";
    }

    public String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String firstNonBlank(String... candidates) {
        if (candidates == null) {
            return null;
        }
        for (String c : candidates) {
            if (c != null && !c.isBlank()) {
                return c.trim();
            }
        }
        return null;
    }
}
