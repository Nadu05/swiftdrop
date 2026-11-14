package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateExceptionStatusRequest {

    @NotBlank(message = "Exception status is required")
    private String status;

    private String resolutionNotes;

    public UpdateExceptionStatusRequest() {
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getResolutionNotes() {
        return resolutionNotes;
    }

    public void setResolutionNotes(String resolutionNotes) {
        this.resolutionNotes = resolutionNotes;
    }
}

