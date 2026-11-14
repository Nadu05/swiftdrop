package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class AssignTransferCourierRequest {

    @NotBlank(message = "Courier identifier is required")
    private String courierId;

    private String notes;
    private String reason;

    public AssignTransferCourierRequest() {
    }

    public AssignTransferCourierRequest(String courierId, String notes) {
        this.courierId = courierId;
        this.notes = notes;
    }

    public String getCourierId() {
        return courierId;
    }

    public void setCourierId(String courierId) {
        this.courierId = courierId;
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

