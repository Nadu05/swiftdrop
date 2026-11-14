package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.ManifestParcelStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transfer_manifest_parcels")
public class TransferManifestParcel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "manifest_id", nullable = false)
    private TransferManifest manifest;

    @Column(name = "pickup_task_id")
    private Long pickupTaskId;

    @Column(name = "order_id", nullable = false, length = 64)
    private String orderId;

    @Column(name = "tracking_number", nullable = false, length = 32)
    private String trackingNumber;

    @Column(name = "parcel_reference", nullable = false, length = 64)
    private String parcelReference;

    @Column(name = "weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal weightKg = BigDecimal.ONE;

    @Column(name = "parcel_category", length = 150)
    private String parcelCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private ManifestParcelStatus status = ManifestParcelStatus.MANIFESTED;

    @Column(name = "discrepancy_notes", length = 500)
    private String discrepancyNotes;

    @Column(name = "added_at", nullable = false, updatable = false)
    private LocalDateTime addedAt;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @PrePersist
    protected void onCreate() {
        if (this.addedAt == null) {
            this.addedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TransferManifest getManifest() {
        return manifest;
    }

    public void setManifest(TransferManifest manifest) {
        this.manifest = manifest;
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

    public ManifestParcelStatus getStatus() {
        return status;
    }

    public void setStatus(ManifestParcelStatus status) {
        this.status = status;
    }

    public String getDiscrepancyNotes() {
        return discrepancyNotes;
    }

    public void setDiscrepancyNotes(String discrepancyNotes) {
        this.discrepancyNotes = discrepancyNotes;
    }

    public LocalDateTime getAddedAt() {
        return addedAt;
    }

    public void setAddedAt(LocalDateTime addedAt) {
        this.addedAt = addedAt;
    }

    public LocalDateTime getDispatchedAt() {
        return dispatchedAt;
    }

    public void setDispatchedAt(LocalDateTime dispatchedAt) {
        this.dispatchedAt = dispatchedAt;
    }

    public LocalDateTime getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(LocalDateTime receivedAt) {
        this.receivedAt = receivedAt;
    }
}

