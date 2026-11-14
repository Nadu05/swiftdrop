package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.List;

public class CreateTransferManifestRequest {

    private Long originBranchId;
    private String originBranchCode;
    private String originBranchName;

    @NotNull(message = "Destination branch id is required")
    private Long destinationBranchId;

    private String destinationBranchCode;
    private String destinationBranchName;

    private List<String> parcelKeys = new ArrayList<>();
    private List<String> orderIds = new ArrayList<>();
    private List<String> trackingNumbers = new ArrayList<>();

    private String notes;

    public CreateTransferManifestRequest() {
    }

    public Long getOriginBranchId() {
        return originBranchId;
    }

    public void setOriginBranchId(Long originBranchId) {
        this.originBranchId = originBranchId;
    }

    public String getOriginBranchCode() {
        return originBranchCode;
    }

    public void setOriginBranchCode(String originBranchCode) {
        this.originBranchCode = originBranchCode;
    }

    public String getOriginBranchName() {
        return originBranchName;
    }

    public void setOriginBranchName(String originBranchName) {
        this.originBranchName = originBranchName;
    }

    public Long getDestinationBranchId() {
        return destinationBranchId;
    }

    public void setDestinationBranchId(Long destinationBranchId) {
        this.destinationBranchId = destinationBranchId;
    }

    public String getDestinationBranchCode() {
        return destinationBranchCode;
    }

    public void setDestinationBranchCode(String destinationBranchCode) {
        this.destinationBranchCode = destinationBranchCode;
    }

    public String getDestinationBranchName() {
        return destinationBranchName;
    }

    public void setDestinationBranchName(String destinationBranchName) {
        this.destinationBranchName = destinationBranchName;
    }

    public List<String> getParcelKeys() {
        return parcelKeys;
    }

    public void setParcelKeys(List<String> parcelKeys) {
        this.parcelKeys = parcelKeys;
    }

    public List<String> getOrderIds() {
        return orderIds;
    }

    public void setOrderIds(List<String> orderIds) {
        this.orderIds = orderIds;
    }

    public List<String> getTrackingNumbers() {
        return trackingNumbers;
    }

    public void setTrackingNumbers(List<String> trackingNumbers) {
        this.trackingNumbers = trackingNumbers;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

