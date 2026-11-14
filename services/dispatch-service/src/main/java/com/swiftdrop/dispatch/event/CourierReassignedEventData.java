package com.swiftdrop.dispatch.event;

/**
 * Event payload data for dispatch.courier.reassigned event.
 */
public class CourierReassignedEventData {

    private Long assignmentId;
    private Long orderId;
    private Long previousCourierId;
    private Long newCourierId;
    private Long branchId;
    private String status;
    private String reason;
    private Long changedBy;

    public CourierReassignedEventData() {
    }

    public CourierReassignedEventData(Long assignmentId, Long orderId, Long previousCourierId,
                                      Long newCourierId, Long branchId, String status,
                                      String reason, Long changedBy) {
        this.assignmentId = assignmentId;
        this.orderId = orderId;
        this.previousCourierId = previousCourierId;
        this.newCourierId = newCourierId;
        this.branchId = branchId;
        this.status = status;
        this.reason = reason;
        this.changedBy = changedBy;
    }

    public Long getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(Long assignmentId) {
        this.assignmentId = assignmentId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getPreviousCourierId() {
        return previousCourierId;
    }

    public void setPreviousCourierId(Long previousCourierId) {
        this.previousCourierId = previousCourierId;
    }

    public Long getNewCourierId() {
        return newCourierId;
    }

    public void setNewCourierId(Long newCourierId) {
        this.newCourierId = newCourierId;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

