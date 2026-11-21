package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class AssignCourierRequest {
    private String orderId;
    private Long deliveryJobId;
    private Long pickupTaskId;

    @NotBlank(message = "Courier identifier is required")
    private String courierId;

    private String taskType;
    private String priority;
    private String notes;
    private String reason;

    public AssignCourierRequest() {
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public Long getDeliveryJobId() {
        return deliveryJobId;
    }

    public void setDeliveryJobId(Long deliveryJobId) {
        this.deliveryJobId = deliveryJobId;
    }

    public Long getPickupTaskId() {
        return pickupTaskId;
    }

    public void setPickupTaskId(Long pickupTaskId) {
        this.pickupTaskId = pickupTaskId;
    }

    public String getCourierId() {
        return courierId;
    }

    public void setCourierId(String courierId) {
        this.courierId = courierId;
    }

    public String getTaskType() {
        return taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}

