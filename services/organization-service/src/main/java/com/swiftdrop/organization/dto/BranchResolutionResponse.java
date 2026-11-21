package com.swiftdrop.organization.dto;

/**
 * Response payload returned when an eligible branch is selected for a pickup location.
 * Consumed by the Order Service and other clients.
 */
public class BranchResolutionResponse {

    private Long branchId;
    private String branchCode;
    private String branchName;
    private Double distanceKm;
    private boolean eligible;

    public BranchResolutionResponse() {}

    public BranchResolutionResponse(Long branchId, String branchCode, String branchName,
                                    Double distanceKm, boolean eligible) {
        this.branchId = branchId;
        this.branchCode = branchCode;
        this.branchName = branchName;
        this.distanceKm = distanceKm;
        this.eligible = eligible;
    }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getBranchCode() { return branchCode; }
    public void setBranchCode(String branchCode) { this.branchCode = branchCode; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public boolean isEligible() { return eligible; }
    public void setEligible(boolean eligible) { this.eligible = eligible; }
}

