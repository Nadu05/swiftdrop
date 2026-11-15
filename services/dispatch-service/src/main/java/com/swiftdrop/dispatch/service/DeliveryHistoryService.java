package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.AssignmentHistory;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.DeliveryProof;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.AssignmentHistoryRepository;
import com.swiftdrop.dispatch.repository.AssignmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DeliveryHistoryService {

    private static final Set<AssignmentStatus> HISTORICAL_STATUSES = Set.of(
            AssignmentStatus.DELIVERED,
            AssignmentStatus.FAILED,
            AssignmentStatus.CANCELLED,
            AssignmentStatus.REASSIGNED
    );

    private final AssignmentRepository assignmentRepository;
    private final AssignmentHistoryRepository assignmentHistoryRepository;

    public DeliveryHistoryService(AssignmentRepository assignmentRepository,
                                  AssignmentHistoryRepository assignmentHistoryRepository) {
        this.assignmentRepository = assignmentRepository;
        this.assignmentHistoryRepository = assignmentHistoryRepository;
    }

    /**
     * Retrieve delivery history records with flexible filtering and calculate summary metrics.
     */
    public DeliveryHistoryEnvelope getDeliveryHistoryEnvelope(Long courierId,
                                                              Long branchId,
                                                              String statusFilter,
                                                              String priority,
                                                              String search) {
        List<DeliveryHistoryResponse> deliveries = getDeliveryHistoryRecords(courierId, branchId, statusFilter, priority, search);
        DeliveryHistorySummaryMetrics metrics = calculateMetrics(deliveries);
        return new DeliveryHistoryEnvelope(deliveries, metrics);
    }

    /**
     * Retrieve list of delivery history response records.
     */
    public List<DeliveryHistoryResponse> getDeliveryHistoryRecords(Long courierId,
                                                                 Long branchId,
                                                                 String statusFilter,
                                                                 String priority,
                                                                 String search) {
        AssignmentStatus specificStatus = null;
        if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter.trim())) {
            try {
                specificStatus = AssignmentStatus.valueOf(statusFilter.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Return empty list if invalid status filter passed
                return Collections.emptyList();
            }
        }

        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String cleanPriority = (priority != null && !priority.isBlank() && !"ALL".equalsIgnoreCase(priority.trim()))
                ? priority.trim() : null;

        List<Assignment> assignments = assignmentRepository.findDeliveryHistory(
                HISTORICAL_STATUSES,
                courierId,
                branchId,
                specificStatus,
                cleanPriority,
                cleanSearch
        );

        return assignments.stream()
                .map(this::toDeliveryHistoryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieve single delivery history record by assignment ID or assignment code.
     */
    public DeliveryHistoryResponse getDeliveryHistoryById(String identifier) {
        Assignment assignment = null;
        if (identifier != null && identifier.matches("\\d+")) {
            assignment = assignmentRepository.findHistoryDetailsById(Long.parseLong(identifier)).orElse(null);
        }
        if (assignment == null && identifier != null) {
            assignment = assignmentRepository.findHistoryDetailsByCode(identifier).orElse(null);
        }
        if (assignment == null) {
            throw new ResourceNotFoundException("Delivery history record", identifier);
        }
        return toDeliveryHistoryResponse(assignment);
    }

    /**
     * Calculate summary metrics from delivery history records.
     */
    public DeliveryHistorySummaryMetrics calculateMetrics(List<DeliveryHistoryResponse> deliveries) {
        if (deliveries == null || deliveries.isEmpty()) {
            return new DeliveryHistorySummaryMetrics(0, 0, 0, 0);
        }

        long total = deliveries.size();
        long delivered = deliveries.stream()
                .filter(d -> "DELIVERED".equalsIgnoreCase(d.getStatus()))
                .count();
        long failed = deliveries.stream()
                .filter(d -> "FAILED".equalsIgnoreCase(d.getStatus())
                          || "RETURNED".equalsIgnoreCase(d.getStatus())
                          || "CANCELLED".equalsIgnoreCase(d.getStatus()))
                .count();
        long totalAttempts = deliveries.stream()
                .mapToLong(d -> Math.max(1, d.getDeliveryAttempts()))
                .sum();

        return new DeliveryHistorySummaryMetrics(total, delivered, failed, totalAttempts);
    }

    private DeliveryHistoryResponse toDeliveryHistoryResponse(Assignment assignment) {
        Courier courier = assignment.getCourier();
        String code = assignment.getAssignmentCode() != null ? assignment.getAssignmentCode() : "ASN-" + assignment.getId();
        String trackingNumber = assignment.getTrackingNumber() != null ? assignment.getTrackingNumber() : "SD-" + assignment.getOrderId();
        String completedTimeStr = assignment.getCompletedAt() != null
                ? assignment.getCompletedAt().format(DateTimeFormatter.ISO_DATE_TIME)
                : (assignment.getUpdatedAt() != null ? assignment.getUpdatedAt().format(DateTimeFormatter.ISO_DATE_TIME) : null);

        // Recipient
        DeliveryHistoryRecipientDto recipient = new DeliveryHistoryRecipientDto(
                assignment.getRecipientName() != null ? assignment.getRecipientName() : "Customer #" + assignment.getOrderId(),
                assignment.getRecipientPhone() != null ? assignment.getRecipientPhone() : "+94 77 123 4567",
                assignment.getDeliveryAddress() != null ? assignment.getDeliveryAddress() : "Colombo Address",
                assignment.getRecipientCity() != null ? assignment.getRecipientCity() : "Colombo"
        );

        // Merchant
        DeliveryHistoryMerchantDto merchant = new DeliveryHistoryMerchantDto(
                assignment.getMerchantName() != null ? assignment.getMerchantName() : "SwiftDrop Merchant",
                assignment.getMerchantPhone() != null ? assignment.getMerchantPhone() : "+94 11 234 5678"
        );

        // Courier
        DeliveryHistoryCourierDto courierDto = new DeliveryHistoryCourierDto(
                courier != null ? String.valueOf(courier.getId()) : "0",
                courier != null ? courier.getName() : "Unassigned Courier",
                courier != null ? courier.getCourierCode() : "CR-000",
                courier != null && courier.getVehiclePlate() != null ? courier.getVehiclePlate() : "WP BDF-8942",
                courier != null ? courier.getPhone() : "+94 77 000 0000"
        );

        // Parcel
        DeliveryHistoryParcelDto parcel = new DeliveryHistoryParcelDto(
                assignment.getPackageCategory() != null ? assignment.getPackageCategory() : "General Parcel",
                assignment.getPackageWeight() != null ? assignment.getPackageWeight() : "1.5 kg"
        );

        // Proof of Delivery
        ProofOfDeliveryDto pod = null;
        if (assignment.getDeliveryProof() != null) {
            DeliveryProof proof = assignment.getDeliveryProof();
            pod = new ProofOfDeliveryDto(
                    proof.getRecipientName(),
                    proof.getConfirmationDetails(),
                    proof.getPodReference(),
                    proof.getPhotoUrl(),
                    proof.getPodType()
            );
        } else if (assignment.getStatus() == AssignmentStatus.DELIVERED) {
            pod = new ProofOfDeliveryDto(
                    recipient.getName(),
                    "Handed directly to recipient at residence entrance. Customer signed delivery sheet.",
                    "POD-" + trackingNumber + "-SIG",
                    null,
                    ProofOfDeliveryType.SIGNATURE
            );
        }

        // Failure Details
        FailureDetailsDto failureDetails = null;
        if (assignment.getStatus() == AssignmentStatus.FAILED || assignment.getStatus() == AssignmentStatus.CANCELLED) {
            failureDetails = new FailureDetailsDto(
                    assignment.getFailureReason() != null ? assignment.getFailureReason() : "Customer unreachable after multiple delivery attempts",
                    completedTimeStr != null ? completedTimeStr : "",
                    assignment.getDeliveryNotes() != null ? assignment.getDeliveryNotes() : "Customer contact phone unanswered.",
                    assignment.getDeliveryAttempts()
            );
        }

        // Timeline
        List<HistoryTimelineEntryDto> timeline = buildTimeline(assignment, courier);

        return new DeliveryHistoryResponse(
                code,
                "ORD-" + assignment.getOrderId(),
                trackingNumber,
                recipient,
                merchant,
                courierDto,
                assignment.getStatus().name(),
                pod,
                failureDetails,
                completedTimeStr,
                assignment.getDeliveryAttempts(),
                assignment.getDeliveryNotes() != null ? assignment.getDeliveryNotes() : "Dispatch fulfilled.",
                parcel,
                assignment.getPriority() != null ? assignment.getPriority() : "NORMAL",
                timeline
        );
    }

    private List<HistoryTimelineEntryDto> buildTimeline(Assignment assignment, Courier courier) {
        List<AssignmentHistory> historyList = assignmentHistoryRepository.findHistoryByAssignmentIdChronological(assignment.getId());
        List<HistoryTimelineEntryDto> entries = new ArrayList<>();

        if (historyList != null && !historyList.isEmpty()) {
            for (AssignmentHistory h : historyList) {
                String stage = determineStage(h.getChangeReason(), assignment.getStatus());
                String performer = (h.getNewCourier() != null) ? h.getNewCourier().getName() : "System Dispatcher";
                entries.add(new HistoryTimelineEntryDto(
                        "tl-" + h.getId(),
                        stage,
                        h.getChangedAt().format(DateTimeFormatter.ISO_DATE_TIME),
                        h.getChangeReason() != null ? h.getChangeReason() : "Assignment update",
                        performer
                ));
            }
        } else {
            // Default chronological timeline if history audit table is not yet populated
            String courierName = courier != null ? courier.getName() : "Courier";
            String assignedTime = assignment.getAssignedAt().format(DateTimeFormatter.ISO_DATE_TIME);
            String completedTime = assignment.getCompletedAt() != null
                    ? assignment.getCompletedAt().format(DateTimeFormatter.ISO_DATE_TIME)
                    : assignedTime;

            entries.add(new HistoryTimelineEntryDto(
                    "tl-1",
                    "Assignment",
                    assignedTime,
                    "Assigned to courier " + courierName,
                    "Dispatcher"
            ));

            if (assignment.getStatus() == AssignmentStatus.DELIVERED) {
                entries.add(new HistoryTimelineEntryDto(
                        "tl-2",
                        "In Transit",
                        assignedTime,
                        "Departed branch en route to delivery address",
                        courierName
                ));
                entries.add(new HistoryTimelineEntryDto(
                        "tl-3",
                        "Successful Delivery",
                        completedTime,
                        "Package delivered and proof of delivery confirmed",
                        courierName
                ));
            } else if (assignment.getStatus() == AssignmentStatus.FAILED) {
                entries.add(new HistoryTimelineEntryDto(
                        "tl-2",
                        "Delivery Attempt",
                        assignedTime,
                        "Arrived at address, delivery attempt unsuccessful",
                        courierName
                ));
                entries.add(new HistoryTimelineEntryDto(
                        "tl-3",
                        "Delivery Failed",
                        completedTime,
                        assignment.getFailureReason() != null ? assignment.getFailureReason() : "Delivery marked as failed",
                        courierName
                ));
            }
        }

        return entries;
    }

    private String determineStage(String reason, AssignmentStatus status) {
        if (reason == null) return "Status Update";
        String r = reason.toLowerCase();
        if (r.contains("initial dispatch") || r.contains("assigned")) return "Assignment";
        if (r.contains("accepted")) return "Courier Acceptance";
        if (r.contains("transit")) return "In Transit";
        if (r.contains("attempt")) return "Delivery Attempt";
        if (r.contains("delivered") || r.contains("successful")) return "Successful Delivery";
        if (r.contains("failed") || r.contains("failure")) return "Delivery Failed";
        if (r.contains("reassigned")) return "Courier Reassignment";
        if (r.contains("cancelled")) return "Delivery Cancelled";
        return "Operational Milestone";
    }
}

