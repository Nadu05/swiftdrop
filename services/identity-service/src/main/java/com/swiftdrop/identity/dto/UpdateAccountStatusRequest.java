package com.swiftdrop.identity.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateAccountStatusRequest {

    @NotBlank(message = "Account status is required")
    private String status;

    public UpdateAccountStatusRequest() {}

    public UpdateAccountStatusRequest(String status) {
        this.status = status;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

