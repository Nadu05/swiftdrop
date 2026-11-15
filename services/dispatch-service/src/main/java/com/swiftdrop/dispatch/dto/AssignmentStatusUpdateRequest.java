package com.swiftdrop.dispatch.dto;

import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for transitioning an assignment status.
 */
public class AssignmentStatusUpdateRequest {

    @NotNull(message = "New assignment status is required")
    private AssignmentStatus status;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    private String notes;

    public AssignmentStatusUpdateRequest() {
    }

    public AssignmentStatusUpdateRequest(AssignmentStatus status, String notes) {
        this.status = status;
        this.notes = notes;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

