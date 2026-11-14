package com.swiftdrop.dispatch.dto;

public class CourierAvailabilityUpdateRequest {
    private Boolean online;
    private String status;

    public CourierAvailabilityUpdateRequest() {
    }

    public Boolean getOnline() {
        return online;
    }

    public void setOnline(Boolean online) {
        this.online = online;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
