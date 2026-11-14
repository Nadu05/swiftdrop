package com.swiftdrop.dispatch.event;

/**
 * Event payload data for dispatch.delivery.status.changed event.
 */
public class DeliveryStatusChangedEventData {

    private Long assignmentId;
    private Long orderId;
    private Long courierId;
    private String previousStatus;
    private String newStatus;
    private Long changedBy;
    private String notes;

    public DeliveryStatusChangedEventData() {
    }

    public DeliveryStatusChangedEventData(Long assignmentId, Long orderId, Long courierId,
                                          String previousStatus, String newStatus, Long changedBy, String notes) {
        this.assignmentId = assignmentId;
        this.orderId = orderId;
        this.courierId = courierId;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.changedBy = changedBy;
        this.notes = notes;
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

    public String getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(String previousStatus) {
        this.previousStatus = previousStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }

    public Long getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(Long changedBy) {
        this.changedBy = changedBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

