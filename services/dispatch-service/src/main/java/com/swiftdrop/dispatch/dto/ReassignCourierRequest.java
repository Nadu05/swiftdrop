package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class ReassignCourierRequest {
    private String assignmentId;
    private String orderId;
    private String currentCourierId;

    @NotBlank(message = "New courier identifier is required")
    private String newCourierId;

    @NotBlank(message = "Reassignment reason is required")
    private String reason;

    public ReassignCourierRequest() {
    }

    public String getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(String assignmentId) {
        this.assignmentId = assignmentId;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getCurrentCourierId() {
        return currentCourierId;
    }

    public void setCurrentCourierId(String currentCourierId) {
        this.currentCourierId = currentCourierId;
    }

    public String getNewCourierId() {
        return newCourierId;
    }

    public void setNewCourierId(String newCourierId) {
        this.newCourierId = newCourierId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
