package com.swiftdrop.dispatch.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class TransferManifestDto {
    private Long id;
    private String manifestCode;
    private Long originBranchId;
    private String originBranchCode;
    private String originBranchName;
    private Long destinationBranchId;
    private String destinationBranchCode;
    private String destinationBranchName;
    private String status;
    private String assignedCourierId;
    private String assignedCourierCode;
    private String assignedCourierName;
    private String vehicleType;
    private String vehiclePlate;
    private int expectedParcelCount;
    private int receivedParcelCount;
    private int missingParcelCount;
    private int damagedParcelCount;
    private String originHandoverById;
    private String originHandoverByName;
    private String originHandoverAt;
    private String departureAt;
    private String arrivalAt;
    private String destinationReceivedById;
    private String destinationReceivedByName;
    private String destinationReceivedAt;
    private String completedAt;
    private String notes;
    private String discrepancyNotes;
    private String createdById;
    private String createdByName;
    private String createdAt;
    private List<TransferParcelItemDto> parcels = new ArrayList<>();
    private List<CustodyRecordDto> custodyRecords = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getManifestCode() {
        return manifestCode;
    }

    public void setManifestCode(String manifestCode) {
        this.manifestCode = manifestCode;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAssignedCourierId() {
        return assignedCourierId;
    }

    public void setAssignedCourierId(String assignedCourierId) {
        this.assignedCourierId = assignedCourierId;
    }

    public String getAssignedCourierCode() {
        return assignedCourierCode;
    }

    public void setAssignedCourierCode(String assignedCourierCode) {
        this.assignedCourierCode = assignedCourierCode;
    }

    public String getAssignedCourierName() {
        return assignedCourierName;
    }

    public void setAssignedCourierName(String assignedCourierName) {
        this.assignedCourierName = assignedCourierName;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehiclePlate() {
        return vehiclePlate;
    }

    public void setVehiclePlate(String vehiclePlate) {
        this.vehiclePlate = vehiclePlate;
    }

    public int getExpectedParcelCount() {
        return expectedParcelCount;
    }

    public void setExpectedParcelCount(int expectedParcelCount) {
        this.expectedParcelCount = expectedParcelCount;
    }

    public int getReceivedParcelCount() {
        return receivedParcelCount;
    }

    public void setReceivedParcelCount(int receivedParcelCount) {
        this.receivedParcelCount = receivedParcelCount;
    }

    public int getMissingParcelCount() {
        return missingParcelCount;
    }

    public void setMissingParcelCount(int missingParcelCount) {
        this.missingParcelCount = missingParcelCount;
    }

    public int getDamagedParcelCount() {
        return damagedParcelCount;
    }

    public void setDamagedParcelCount(int damagedParcelCount) {
        this.damagedParcelCount = damagedParcelCount;
    }

    public String getOriginHandoverById() {
        return originHandoverById;
    }

    public void setOriginHandoverById(String originHandoverById) {
        this.originHandoverById = originHandoverById;
    }

    public String getOriginHandoverByName() {
        return originHandoverByName;
    }

    public void setOriginHandoverByName(String originHandoverByName) {
        this.originHandoverByName = originHandoverByName;
    }

    public String getOriginHandoverAt() {
        return originHandoverAt;
    }

    public void setOriginHandoverAt(String originHandoverAt) {
        this.originHandoverAt = originHandoverAt;
    }

    public String getDepartureAt() {
        return departureAt;
    }

    public void setDepartureAt(String departureAt) {
        this.departureAt = departureAt;
    }

    public String getArrivalAt() {
        return arrivalAt;
    }

    public void setArrivalAt(String arrivalAt) {
        this.arrivalAt = arrivalAt;
    }

    public String getDestinationReceivedById() {
        return destinationReceivedById;
    }

    public void setDestinationReceivedById(String destinationReceivedById) {
        this.destinationReceivedById = destinationReceivedById;
    }

    public String getDestinationReceivedByName() {
        return destinationReceivedByName;
    }

    public void setDestinationReceivedByName(String destinationReceivedByName) {
        this.destinationReceivedByName = destinationReceivedByName;
    }

    public String getDestinationReceivedAt() {
        return destinationReceivedAt;
    }

    public void setDestinationReceivedAt(String destinationReceivedAt) {
        this.destinationReceivedAt = destinationReceivedAt;
    }

    public String getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(String completedAt) {
        this.completedAt = completedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getDiscrepancyNotes() {
        return discrepancyNotes;
    }

    public void setDiscrepancyNotes(String discrepancyNotes) {
        this.discrepancyNotes = discrepancyNotes;
    }

    public String getCreatedById() {
        return createdById;
    }

    public void setCreatedById(String createdById) {
        this.createdById = createdById;
    }

    public String getCreatedByName() {
        return createdByName;
    }

    public void setCreatedByName(String createdByName) {
        this.createdByName = createdByName;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public List<TransferParcelItemDto> getParcels() {
        return parcels;
    }

    public void setParcels(List<TransferParcelItemDto> parcels) {
        this.parcels = parcels;
    }

    public List<CustodyRecordDto> getCustodyRecords() {
        return custodyRecords;
    }

    public void setCustodyRecords(List<CustodyRecordDto> custodyRecords) {
        this.custodyRecords = custodyRecords;
    }

    public static class TransferParcelItemDto {
        private Long id;
        private Long pickupTaskId;
        private String orderId;
        private String trackingNumber;
        private String parcelReference;
        private BigDecimal weightKg;
        private String parcelCategory;
        private String status;
        private String discrepancyNotes;
        private String addedAt;
        private String dispatchedAt;
        private String receivedAt;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public Long getPickupTaskId() {
            return pickupTaskId;
        }

        public void setPickupTaskId(Long pickupTaskId) {
            this.pickupTaskId = pickupTaskId;
        }

        public String getOrderId() {
            return orderId;
        }

        public void setOrderId(String orderId) {
            this.orderId = orderId;
        }

        public String getTrackingNumber() {
            return trackingNumber;
        }

        public void setTrackingNumber(String trackingNumber) {
            this.trackingNumber = trackingNumber;
        }

        public String getParcelReference() {
            return parcelReference;
        }

        public void setParcelReference(String parcelReference) {
            this.parcelReference = parcelReference;
        }

        public BigDecimal getWeightKg() {
            return weightKg;
        }

        public void setWeightKg(BigDecimal weightKg) {
            this.weightKg = weightKg;
        }

        public String getParcelCategory() {
            return parcelCategory;
        }

        public void setParcelCategory(String parcelCategory) {
            this.parcelCategory = parcelCategory;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getDiscrepancyNotes() {
            return discrepancyNotes;
        }

        public void setDiscrepancyNotes(String discrepancyNotes) {
            this.discrepancyNotes = discrepancyNotes;
        }

        public String getAddedAt() {
            return addedAt;
        }

        public void setAddedAt(String addedAt) {
            this.addedAt = addedAt;
        }

        public String getDispatchedAt() {
            return dispatchedAt;
        }

        public void setDispatchedAt(String dispatchedAt) {
            this.dispatchedAt = dispatchedAt;
        }

        public String getReceivedAt() {
            return receivedAt;
        }

        public void setReceivedAt(String receivedAt) {
            this.receivedAt = receivedAt;
        }
    }
}

