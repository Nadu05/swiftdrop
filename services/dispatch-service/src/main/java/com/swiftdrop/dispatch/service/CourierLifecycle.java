package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.entity.CourierAssignment;
import com.swiftdrop.dispatch.entity.DeliveryJob;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.AssignmentTaskType;
import com.swiftdrop.dispatch.entity.enums.DeliveryJobStatus;
import com.swiftdrop.dispatch.exception.DispatchValidationException;

import java.util.List;

/**
 * Single source of truth for which courier actions are valid in which state.
 * Used both to reject invalid transitions and to tell the UI which buttons to show.
 */
public final class CourierLifecycle {

    public static final String ACCEPT = "ACCEPT";
    public static final String PICKUP = "PICKUP";
    public static final String DELIVER = "DELIVER";
    public static final String FAIL = "FAIL";

    private CourierLifecycle() {
    }

    public static List<String> allowedActions(CourierAssignment a) {
        if (a == null || a.getStatus() == null) {
            return List.of();
        }
        DeliveryJob job = a.getDeliveryJob();
        if (job != null && (job.getStatus() == DeliveryJobStatus.PENDING_DISPATCHER_DECISION
                || job.getAttemptCount() >= job.getMaxAttempts() && job.getStatus() != DeliveryJobStatus.DELIVERED)) {
            return List.of();
        }
        boolean delivery = a.getTaskType() == AssignmentTaskType.DELIVERY && job != null;
        return switch (a.getStatus()) {
            // REASSIGNED is shown to the new courier as ASSIGNED (see DispatchService job mapping)
            case ASSIGNED, REASSIGNED -> List.of(ACCEPT);
            case ACCEPTED -> List.of(PICKUP);
            case IN_TRANSIT -> delivery ? List.of(DELIVER, FAIL) : List.of();
            // A failed attempt that did not hit the attempt limit can be retried on the same assignment
            case FAILED -> delivery && job.getStatus() == DeliveryJobStatus.FAILED
                    ? List.of(DELIVER, FAIL) : List.of();
            default -> List.of();
        };
    }

    public static void require(CourierAssignment a, String action) {
        if (!allowedActions(a).contains(action)) {
            AssignmentStatus status = a == null ? null : a.getStatus();
            throw new DispatchValidationException(
                    "INVALID_TRANSITION",
                    "Action " + action + " is not allowed while the assignment is " + status
                            + (allowedActions(a).isEmpty() ? "" : " (allowed: " + allowedActions(a) + ")"));
        }
    }
}
