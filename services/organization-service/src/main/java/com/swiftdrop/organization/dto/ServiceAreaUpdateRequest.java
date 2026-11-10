package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/**
 * Request payload for partially updating an existing branch service area.
 * All fields are optional. Database-managed fields (id, branch, timestamps) cannot be modified here.
 */
public class ServiceAreaUpdateRequest {

    @Size(max = 255, message = "Area name must be at most 255 characters")
    private String areaName;

    @DecimalMin(value = "-90.0", message = "Center latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Center latitude must be between -90 and 90")
    private Double centerLatitude;

    @DecimalMin(value = "-180.0", message = "Center longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Center longitude must be between -180 and 180")
    private Double centerLongitude;

    @DecimalMin(value = "0.0", inclusive = false, message = "Maximum radius must be greater than zero")
    private BigDecimal maxRadiusKm;

    @Size(max = 20, message = "Status must be at most 20 characters")
    private String status;

    public ServiceAreaUpdateRequest() {}

    public String getAreaName() { return areaName; }
    public void setAreaName(String areaName) { this.areaName = areaName; }

    public Double getCenterLatitude() { return centerLatitude; }
    public void setCenterLatitude(Double centerLatitude) { this.centerLatitude = centerLatitude; }

    public Double getCenterLongitude() { return centerLongitude; }
    public void setCenterLongitude(Double centerLongitude) { this.centerLongitude = centerLongitude; }

    public BigDecimal getMaxRadiusKm() { return maxRadiusKm; }
    public void setMaxRadiusKm(BigDecimal maxRadiusKm) { this.maxRadiusKm = maxRadiusKm; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

