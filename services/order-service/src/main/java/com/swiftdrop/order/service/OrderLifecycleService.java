package com.swiftdrop.order.service;

import com.swiftdrop.order.dto.OrderStatusUpdateRequest;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.TrackingEvent;
import com.swiftdrop.order.entity.enums.OrderLifecycleStatus;
import com.swiftdrop.order.entity.enums.PaymentMethod;
import com.swiftdrop.order.entity.enums.PaymentStatus;
import com.swiftdrop.order.entity.enums.PickupMethod;
import com.swiftdrop.order.exception.InvalidOrderStateTransitionException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Dedicated business service that validates and executes all parcel lifecycle transitions.
 *
 * Enforces:
 * - All 14 canonical statuses (9 normal + 5 exception)
 * - Branch drop-off direct transition to AT_ORIGIN_BRANCH without courier pickup assignment (BD-04, BD-05)
 * - Maximum 3 delivery attempts before escalating to PENDING_DISPATCHER_DECISION (BD-02, BD-07)
 * - Delivery proof requirements on DELIVERED (BD-08)
 * - Immutable TrackingEvent audit history
 */
@Service
public class OrderLifecycleService {

    public static final int MAX_DELIVERY_ATTEMPTS = 3;

    private static final Map<OrderLifecycleStatus, Set<OrderLifecycleStatus>> ALLOWED_TRANSITIONS =
            new EnumMap<>(OrderLifecycleStatus.class);

    static {
        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.CREATED, EnumSet.of(
                OrderLifecycleStatus.CONFIRMED,
                OrderLifecycleStatus.PICKUP_ASSIGNED,
                OrderLifecycleStatus.AT_ORIGIN_BRANCH,
                OrderLifecycleStatus.CANCELLED
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.CONFIRMED, EnumSet.of(
                OrderLifecycleStatus.PICKUP_ASSIGNED,
                OrderLifecycleStatus.AT_ORIGIN_BRANCH,
                OrderLifecycleStatus.CANCELLED
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.PICKUP_ASSIGNED, EnumSet.of(
                OrderLifecycleStatus.PICKED_UP,
                OrderLifecycleStatus.CANCELLED
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.PICKED_UP, EnumSet.of(
                OrderLifecycleStatus.AT_ORIGIN_BRANCH,
                OrderLifecycleStatus.IN_TRANSIT,
                OrderLifecycleStatus.OUT_FOR_DELIVERY
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.AT_ORIGIN_BRANCH, EnumSet.of(
                OrderLifecycleStatus.IN_TRANSIT,
                OrderLifecycleStatus.AT_DESTINATION_BRANCH,
                OrderLifecycleStatus.OUT_FOR_DELIVERY
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.IN_TRANSIT, EnumSet.of(
                OrderLifecycleStatus.AT_DESTINATION_BRANCH
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.AT_DESTINATION_BRANCH, EnumSet.of(
                OrderLifecycleStatus.OUT_FOR_DELIVERY
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.OUT_FOR_DELIVERY, EnumSet.of(
                OrderLifecycleStatus.DELIVERED,
                OrderLifecycleStatus.DELIVERY_FAILED,
                OrderLifecycleStatus.PENDING_DISPATCHER_DECISION
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.DELIVERY_FAILED, EnumSet.of(
                OrderLifecycleStatus.OUT_FOR_DELIVERY,
                OrderLifecycleStatus.PENDING_DISPATCHER_DECISION
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.PENDING_DISPATCHER_DECISION, EnumSet.of(
                OrderLifecycleStatus.RETURN_TO_SENDER,
                OrderLifecycleStatus.OUT_FOR_DELIVERY
        ));

        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.RETURN_TO_SENDER, EnumSet.of(
                OrderLifecycleStatus.RETURNED_TO_SENDER
        ));

        // Terminal states
        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.DELIVERED, EnumSet.noneOf(OrderLifecycleStatus.class));
        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.RETURNED_TO_SENDER, EnumSet.noneOf(OrderLifecycleStatus.class));
        ALLOWED_TRANSITIONS.put(OrderLifecycleStatus.CANCELLED, EnumSet.noneOf(OrderLifecycleStatus.class));
    }

    public boolean isTransitionAllowed(
            OrderLifecycleStatus currentStatus,
            OrderLifecycleStatus targetStatus,
            PickupMethod pickupMethod) {

        if (currentStatus == null || targetStatus == null) {
            return false;
        }
        Set<OrderLifecycleStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowed.contains(targetStatus)) {
            return false;
        }

        // Branch drop-off orders do not use courier pickup assignment
        if (pickupMethod == PickupMethod.BRANCH_DROPOFF
                && (targetStatus == OrderLifecycleStatus.PICKUP_ASSIGNED
                || targetStatus == OrderLifecycleStatus.PICKED_UP)) {
            return false;
        }

        // Courier pickup orders must go through PICKUP_ASSIGNED -> PICKED_UP before AT_ORIGIN_BRANCH
        if (pickupMethod == PickupMethod.COURIER_PICKUP
                && (currentStatus == OrderLifecycleStatus.CREATED || currentStatus == OrderLifecycleStatus.CONFIRMED)
                && targetStatus == OrderLifecycleStatus.AT_ORIGIN_BRANCH) {
            return false;
        }

        return true;
    }

    public void validateAndTransition(
            DeliveryOrder order,
            OrderLifecycleStatus targetStatus,
            OrderStatusUpdateRequest request,
            String actorId,
            String actorRole) {

        OrderLifecycleStatus currentStatus = order.getStatus();
        if (currentStatus.isTerminal()) {
            throw new InvalidOrderStateTransitionException(
                    "Order " + order.getTrackingNumber() + " is in terminal state "
                            + currentStatus + " and cannot transition to " + targetStatus
            );
        }

        if (!isTransitionAllowed(currentStatus, targetStatus, order.getPickupMethod())) {
            if (order.getPickupMethod() == PickupMethod.BRANCH_DROPOFF
                    && (targetStatus == OrderLifecycleStatus.PICKUP_ASSIGNED
                    || targetStatus == OrderLifecycleStatus.PICKED_UP)) {
                throw new InvalidOrderStateTransitionException(
                        "Branch drop-off order " + order.getTrackingNumber()
                                + " does not require courier pickup assignment; transition directly to AT_ORIGIN_BRANCH"
                );
            }
            if (order.getPickupMethod() == PickupMethod.COURIER_PICKUP
                    && (currentStatus == OrderLifecycleStatus.CREATED || currentStatus == OrderLifecycleStatus.CONFIRMED)
                    && targetStatus == OrderLifecycleStatus.AT_ORIGIN_BRANCH) {
                throw new InvalidOrderStateTransitionException(
                        "Courier pickup order " + order.getTrackingNumber()
                                + " must be assigned and picked up before arriving at origin branch"
                );
            }
            throw new InvalidOrderStateTransitionException(
                    "Invalid status transition from " + currentStatus + " to " + targetStatus
                            + " for order " + order.getTrackingNumber()
            );
        }

        // BD-02 & BD-07: Maximum 3 delivery attempts before escalating to PENDING_DISPATCHER_DECISION
        if (currentStatus == OrderLifecycleStatus.DELIVERY_FAILED
                && targetStatus == OrderLifecycleStatus.OUT_FOR_DELIVERY
                && order.getFailedAttemptCount() >= MAX_DELIVERY_ATTEMPTS) {
            throw new InvalidOrderStateTransitionException(
                    "Order " + order.getTrackingNumber() + " has reached the maximum of "
                            + MAX_DELIVERY_ATTEMPTS + " failed delivery attempts and requires a dispatcher decision"
            );
        }

        OrderLifecycleStatus effectiveTargetStatus = targetStatus;
        if (targetStatus == OrderLifecycleStatus.DELIVERY_FAILED) {
            int updatedAttempts = order.getFailedAttemptCount() + 1;
            order.setFailedAttemptCount(updatedAttempts);
            if (updatedAttempts >= MAX_DELIVERY_ATTEMPTS) {
                effectiveTargetStatus = OrderLifecycleStatus.PENDING_DISPATCHER_DECISION;
            }
        }

        // Update courier metadata if provided
        if (request != null) {
            if (request.getCourierId() != null && !request.getCourierId().isBlank()) {
                order.setAssignedCourierId(request.getCourierId().trim());
            }
            if (request.getCourierName() != null && !request.getCourierName().isBlank()) {
                order.setAssignedCourierName(request.getCourierName().trim());
            }
            if (request.getCourierPhone() != null && !request.getCourierPhone().isBlank()) {
                order.setAssignedCourierPhone(request.getCourierPhone().trim());
            }
            if (request.getCourierVehicle() != null && !request.getCourierVehicle().isBlank()) {
                order.setAssignedCourierVehicle(request.getCourierVehicle().trim());
            }
        }

        // BD-08: Delivery confirmation records recipient name and signature or photo evidence
        if (effectiveTargetStatus == OrderLifecycleStatus.DELIVERED) {
            if (request != null) {
                if (request.getRecipientConfirmedName() != null && !request.getRecipientConfirmedName().isBlank()) {
                    order.setRecipientConfirmedName(request.getRecipientConfirmedName().trim());
                } else {
                    order.setRecipientConfirmedName(order.getDropoffDetails().getContactName());
                }
                if (request.getSignatureReference() != null && !request.getSignatureReference().isBlank()) {
                    order.setSignatureReference(request.getSignatureReference().trim());
                }
                if (request.getPhotoEvidenceUrl() != null && !request.getPhotoEvidenceUrl().isBlank()) {
                    order.setPhotoEvidenceUrl(request.getPhotoEvidenceUrl().trim());
                }
            }
            order.setDeliveredAt(LocalDateTime.now());
            if (order.getPaymentMethod() == PaymentMethod.COD) {
                order.setPaymentStatus(PaymentStatus.COD_COLLECTED);
            }
        }

        order.setStatus(effectiveTargetStatus);

        String location = (request != null && request.getLocation() != null && !request.getLocation().isBlank())
                ? request.getLocation().trim()
                : resolveDefaultLocation(order, effectiveTargetStatus);

        String description = (request != null && request.getDescription() != null && !request.getDescription().isBlank())
                ? request.getDescription().trim()
                : buildDefaultDescription(order, effectiveTargetStatus);

        TrackingEvent event = new TrackingEvent();
        event.setStatus(effectiveTargetStatus);
        event.setLocation(location);
        event.setDescription(description);
        event.setActorId(actorId != null ? actorId : "system");
        event.setActorRole(actorRole != null ? actorRole : "SYSTEM");
        order.addTrackingEvent(event);
    }

    private String resolveDefaultLocation(DeliveryOrder order, OrderLifecycleStatus status) {
        return switch (status) {
            case CREATED, CONFIRMED, PICKUP_ASSIGNED, PICKED_UP, AT_ORIGIN_BRANCH -> order.getOriginBranchName();
            case IN_TRANSIT -> order.getOriginBranchName() + " -> " + order.getDestinationBranchName();
            case AT_DESTINATION_BRANCH, OUT_FOR_DELIVERY, DELIVERED, DELIVERY_FAILED, PENDING_DISPATCHER_DECISION ->
                    order.getDestinationBranchName();
            case RETURN_TO_SENDER, RETURNED_TO_SENDER -> order.getOriginBranchName();
            case CANCELLED -> order.getOriginBranchName();
        };
    }

    private String buildDefaultDescription(DeliveryOrder order, OrderLifecycleStatus status) {
        return switch (status) {
            case CREATED -> "Delivery order created and assigned to " + order.getOriginBranchName();
            case CONFIRMED -> "Delivery order confirmed and queued for dispatch";
            case PICKUP_ASSIGNED -> "Courier assigned for parcel pickup";
            case PICKED_UP -> "Parcel collected by courier from sender";
            case AT_ORIGIN_BRANCH -> order.getPickupMethod() == PickupMethod.BRANCH_DROPOFF
                    ? "Parcel dropped off directly at origin branch (" + order.getOriginBranchName() + ")"
                    : "Parcel received at origin branch (" + order.getOriginBranchName() + ")";
            case IN_TRANSIT -> "Parcel in inter-branch transit from " + order.getOriginBranchName()
                    + " to " + order.getDestinationBranchName();
            case AT_DESTINATION_BRANCH -> "Parcel arrived at destination branch (" + order.getDestinationBranchName() + ")";
            case OUT_FOR_DELIVERY -> "Parcel is out for final-mile delivery to recipient";
            case DELIVERED -> "Parcel delivered to recipient";
            case DELIVERY_FAILED -> "Delivery attempt #" + order.getFailedAttemptCount() + " was unsuccessful";
            case PENDING_DISPATCHER_DECISION -> "Maximum delivery attempts (" + MAX_DELIVERY_ATTEMPTS
                    + ") reached; awaiting dispatcher decision";
            case RETURN_TO_SENDER -> "Dispatcher initiated parcel return to sender";
            case RETURNED_TO_SENDER -> "Parcel returned to sender";
            case CANCELLED -> "Delivery order cancelled";
        };
    }
}

