package com.swiftdrop.dispatch.event;

/**
 * Event payload data for dispatch.courier.assigned event.
 */
public class CourierAssignedEventData {

    private Long assignmentId;
    private Long orderId;
    private Long courierId;
    private Long branchId;
    private String status;

    public CourierAssignedEventData() {
    }

    public CourierAssignedEventData(Long assignmentId, Long orderId, Long courierId, Long branchId, String status) {
        this.assignmentId = assignmentId;
        this.orderId = orderId;
        this.courierId = courierId;
        this.branchId = branchId;
        this.status = status;
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

    public Long getCourierId() {
        return courierId;
    }

    public void setCourierId(Long courierId) {
        this.courierId = courierId;
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
}

