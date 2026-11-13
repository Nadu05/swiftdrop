package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/**
 * Request payload for creating a new branch service area.
 */
public class ServiceAreaCreateRequest {

    @NotNull(message = "Branch ID is required")
    private Long branchId;

    @NotBlank(message = "Area name is required")
    @Size(max = 255, message = "Area name must be at most 255 characters")
    private String areaName;

    @NotNull(message = "Center latitude is required")
    @DecimalMin(value = "-90.0", message = "Center latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Center latitude must be between -90 and 90")
    private Double centerLatitude;

    @NotNull(message = "Center longitude is required")
    @DecimalMin(value = "-180.0", message = "Center longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Center longitude must be between -180 and 180")
    private Double centerLongitude;

    @NotNull(message = "Maximum radius in km is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Maximum radius must be greater than zero")
    private BigDecimal maxRadiusKm;

    public ServiceAreaCreateRequest() {}

    public ServiceAreaCreateRequest(Long branchId, String areaName, Double centerLatitude,
                                    Double centerLongitude, BigDecimal maxRadiusKm) {
        this.branchId = branchId;
        this.areaName = areaName;
        this.centerLatitude = centerLatitude;
        this.centerLongitude = centerLongitude;
        this.maxRadiusKm = maxRadiusKm;
    }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getAreaName() { return areaName; }
    public void setAreaName(String areaName) { this.areaName = areaName; }

    public Double getCenterLatitude() { return centerLatitude; }
    public void setCenterLatitude(Double centerLatitude) { this.centerLatitude = centerLatitude; }

    public Double getCenterLongitude() { return centerLongitude; }
    public void setCenterLongitude(Double centerLongitude) { this.centerLongitude = centerLongitude; }

    public BigDecimal getMaxRadiusKm() { return maxRadiusKm; }
    public void setMaxRadiusKm(BigDecimal maxRadiusKm) { this.maxRadiusKm = maxRadiusKm; }
}

