package com.swiftdrop.organization.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response representation of a branch service area.
 */
public class ServiceAreaResponse {

    private Long id;
    private Long branchId;
    private String branchCode;
    private String branchName;
    private String areaName;
    private Double centerLatitude;
    private Double centerLongitude;
    private BigDecimal maxRadiusKm;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ServiceAreaResponse() {}

    public ServiceAreaResponse(Long id, Long branchId, String branchCode, String branchName,
                               String areaName, Double centerLatitude, Double centerLongitude,
                               BigDecimal maxRadiusKm, String status, LocalDateTime createdAt,
                               LocalDateTime updatedAt) {
        this.id = id;
        this.branchId = branchId;
        this.branchCode = branchCode;
        this.branchName = branchName;
        this.areaName = areaName;
        this.centerLatitude = centerLatitude;
        this.centerLongitude = centerLongitude;
        this.maxRadiusKm = maxRadiusKm;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getBranchCode() { return branchCode; }
    public void setBranchCode(String branchCode) { this.branchCode = branchCode; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

