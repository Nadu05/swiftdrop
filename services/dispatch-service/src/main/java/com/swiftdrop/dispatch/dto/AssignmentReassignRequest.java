package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for reassigning an active courier delivery assignment to a different courier.
 */
public class AssignmentReassignRequest {

    @NotNull(message = "Courier ID is required")
    private Long courierId;

    @Size(max = 1000, message = "Reason cannot exceed 1000 characters")
    private String reason;

    private Long changedBy;

    public AssignmentReassignRequest() {
    }

    public AssignmentReassignRequest(Long courierId, String reason) {
        this.courierId = courierId;
        this.reason = reason;
    }

    public AssignmentReassignRequest(Long courierId, String reason, Long changedBy) {
        this.courierId = courierId;
        this.reason = reason;
        this.changedBy = changedBy;
    }

    public Long getCourierId() {
        return courierId;
    }

    public void setCourierId(Long courierId) {
        this.courierId = courierId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Long getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(Long changedBy) {
        this.changedBy = changedBy;
    }
}

