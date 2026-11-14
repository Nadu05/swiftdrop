package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class ConfirmReturnToSenderRequest {

    @NotBlank(message = "Sender/merchant confirmation recipient name is required")
    private String senderConfirmedBy;

    private String confirmationReference;
    private String notes;

    public ConfirmReturnToSenderRequest() {
    }

    public String getSenderConfirmedBy() {
        return senderConfirmedBy;
    }

    public void setSenderConfirmedBy(String senderConfirmedBy) {
        this.senderConfirmedBy = senderConfirmedBy;
    }

    public String getConfirmationReference() {
        return confirmationReference;
    }

    public void setConfirmationReference(String confirmationReference) {
        this.confirmationReference = confirmationReference;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

