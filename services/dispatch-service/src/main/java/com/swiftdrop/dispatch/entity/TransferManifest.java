package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.TransferManifestStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "transfer_manifests")
public class TransferManifest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "manifest_code", nullable = false, unique = true, length = 32)
    private String manifestCode;

    @Column(name = "origin_branch_id", nullable = false)
    private Long originBranchId;

    @Column(name = "origin_branch_code", nullable = false, length = 32)
    private String originBranchCode;

    @Column(name = "origin_branch_name", nullable = false, length = 150)
    private String originBranchName;

    @Column(name = "destination_branch_id", nullable = false)
    private Long destinationBranchId;

    @Column(name = "destination_branch_code", nullable = false, length = 32)
    private String destinationBranchCode;

    @Column(name = "destination_branch_name", nullable = false, length = 150)
    private String destinationBranchName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private TransferManifestStatus status = TransferManifestStatus.DRAFT;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_courier_id")
    private CourierProfileEntity assignedCourier;

    @Column(name = "assigned_courier_code", length = 32)
    private String assignedCourierCode;

    @Column(name = "assigned_courier_name", length = 150)
    private String assignedCourierName;

    @Column(name = "vehicle_type", length = 30)
    private String vehicleType;

    @Column(name = "vehicle_plate", length = 40)
    private String vehiclePlate;

    @Column(name = "expected_parcel_count", nullable = false)
    private int expectedParcelCount = 0;

    @Column(name = "received_parcel_count", nullable = false)
    private int receivedParcelCount = 0;

    @Column(name = "missing_parcel_count", nullable = false)
    private int missingParcelCount = 0;

    @Column(name = "damaged_parcel_count", nullable = false)
    private int damagedParcelCount = 0;

    @Column(name = "origin_handover_by_id", length = 120)
    private String originHandoverById;

    @Column(name = "origin_handover_by_name", length = 150)
    private String originHandoverByName;

    @Column(name = "origin_handover_at")
    private LocalDateTime originHandoverAt;

    @Column(name = "departure_at")
    private LocalDateTime departureAt;

    @Column(name = "arrival_at")
    private LocalDateTime arrivalAt;

    @Column(name = "destination_received_by_id", length = 120)
    private String destinationReceivedById;

    @Column(name = "destination_received_by_name", length = 150)
    private String destinationReceivedByName;

    @Column(name = "destination_received_at")
    private LocalDateTime destinationReceivedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "discrepancy_notes", length = 1000)
    private String discrepancyNotes;

    @Column(name = "created_by_id", length = 120)
    private String createdById;

    @Column(name = "created_by_name", length = 150)
    private String createdByName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "manifest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("addedAt ASC")
    private List<TransferManifestParcel> parcels = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addParcel(TransferManifestParcel parcel) {
        parcel.setManifest(this);
        this.parcels.add(parcel);
    }

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

    public TransferManifestStatus getStatus() {
        return status;
    }

    public void setStatus(TransferManifestStatus status) {
        this.status = status;
    }

    public CourierProfileEntity getAssignedCourier() {
        return assignedCourier;
    }

    public void setAssignedCourier(CourierProfileEntity assignedCourier) {
        this.assignedCourier = assignedCourier;
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

    public LocalDateTime getOriginHandoverAt() {
        return originHandoverAt;
    }

    public void setOriginHandoverAt(LocalDateTime originHandoverAt) {
        this.originHandoverAt = originHandoverAt;
    }

    public LocalDateTime getDepartureAt() {
        return departureAt;
    }

    public void setDepartureAt(LocalDateTime departureAt) {
        this.departureAt = departureAt;
    }

    public LocalDateTime getArrivalAt() {
        return arrivalAt;
    }

    public void setArrivalAt(LocalDateTime arrivalAt) {
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

    public LocalDateTime getDestinationReceivedAt() {
        return destinationReceivedAt;
    }

    public void setDestinationReceivedAt(LocalDateTime destinationReceivedAt) {
        this.destinationReceivedAt = destinationReceivedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<TransferManifestParcel> getParcels() {
        return parcels;
    }

    public void setParcels(List<TransferManifestParcel> parcels) {
        this.parcels = parcels;
    }
}

