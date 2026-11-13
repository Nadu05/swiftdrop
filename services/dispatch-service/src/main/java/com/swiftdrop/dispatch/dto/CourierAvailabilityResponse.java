package com.swiftdrop.dispatch.dto;

import com.swiftdrop.dispatch.entity.enums.CourierStatus;

public class CourierAvailabilityResponse {

    private Long id;
    private String courierCode;
    private String name;
    private CourierStatus status;
    private Integer activeDeliveries;
    private Integer maxCapacity;
    private Boolean isEligible;
    private String ineligibilityReason;

    public CourierAvailabilityResponse() {
    }

    public CourierAvailabilityResponse(Long id, String courierCode, String name, CourierStatus status,
                                       Integer activeDeliveries, Integer maxCapacity,
                                       Boolean isEligible, String ineligibilityReason) {
        this.id = id;
        this.courierCode = courierCode;
        this.name = name;
        this.status = status;
        this.activeDeliveries = activeDeliveries;
        this.maxCapacity = maxCapacity;
        this.isEligible = isEligible;
        this.ineligibilityReason = ineligibilityReason;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCourierCode() {
        return courierCode;
    }

    public void setCourierCode(String courierCode) {
        this.courierCode = courierCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CourierStatus getStatus() {
        return status;
    }

    public void setStatus(CourierStatus status) {
        this.status = status;
    }

    public Integer getActiveDeliveries() {
        return activeDeliveries;
    }

    public void setActiveDeliveries(Integer activeDeliveries) {
        this.activeDeliveries = activeDeliveries;
    }

    public Integer getMaxCapacity() {
        return maxCapacity;
    }

    public void setMaxCapacity(Integer maxCapacity) {
        this.maxCapacity = maxCapacity;
    }

    public Boolean getIsEligible() {
        return isEligible;
    }

    public void setIsEligible(Boolean isEligible) {
        this.isEligible = isEligible;
    }

    public String getIneligibilityReason() {
        return ineligibilityReason;
    }

    public void setIneligibilityReason(String ineligibilityReason) {
        this.ineligibilityReason = ineligibilityReason;
    }
}

