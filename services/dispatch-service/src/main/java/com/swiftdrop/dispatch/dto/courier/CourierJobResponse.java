package com.swiftdrop.dispatch.dto.courier;

import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

/**
 * One job as the courier sees it: the assignment, its order snapshot and what the courier recorded.
 * Snapshot fields are null when the assignment was created without one.
 */
public record CourierJobResponse(
        Long assignmentId,
        String assignmentCode,
        Long orderId,
        String trackingNumber,
        AssignmentStatus status,
        String priority,
        Stop pickup,
        Recipient recipient,
        Parcel parcel,
        BigDecimal payoutAmount,
        LocalDateTime assignedAt,
        Instant pickedUpAt,
        Instant completedAt,
        ProofOfDelivery proofOfDelivery,
        Failure failure
) {

    public record Stop(String name, String phone, String address, String city) {
    }

    public record Recipient(String name, String phone, String address, String city) {
    }

    public record Parcel(String packageType, BigDecimal weightKg, String handlingNotes) {
    }

    public record ProofOfDelivery(ProofOfDeliveryType type, String receivedBy, String reference) {
    }

    public record Failure(String reason, String notes) {
    }
}
