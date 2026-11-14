package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class RecordReturnMovementRequest {

    @NotBlank(message = "Movement status is required (IN_TRANSIT, AT_ORIGIN_BRANCH, or OUT_FOR_RETURN)")
    private String status;

    private String location;
    private Long branchId;
    private String branchCode;
    private String branchName;
    private Long returnManifestId;
    private String manifestCode;
    private String notes;

    public RecordReturnMovementRequest() {
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public Long getReturnManifestId() {
        return returnManifestId;
    }

    public void setReturnManifestId(Long returnManifestId) {
        this.returnManifestId = returnManifestId;
    }

    public String getManifestCode() {
        return manifestCode;
    }

    public void setManifestCode(String manifestCode) {
        this.manifestCode = manifestCode;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

