package com.swiftdrop.order.dto;

import jakarta.validation.constraints.NotBlank;

public class OrderCancelRequest {

    @NotBlank(message = "Cancellation reason is required")
    private String reason;

    public OrderCancelRequest() {
    }

    public OrderCancelRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}

