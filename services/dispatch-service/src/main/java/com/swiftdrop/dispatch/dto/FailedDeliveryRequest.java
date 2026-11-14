package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class FailedDeliveryRequest {

    @NotBlank(message = "Structured failure reason is required")
    private String reason;

    private String notes;

    public FailedDeliveryRequest() {
    }

    public FailedDeliveryRequest(String reason, String notes) {
        this.reason = reason;
        this.notes = notes;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
