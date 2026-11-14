package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.ReturnTaskStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_tasks")
public class ReturnTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "return_code", nullable = false, unique = true, length = 32)
    private String returnCode;

    @Column(name = "order_id", nullable = false, length = 64)
    private String orderId;

    @Column(name = "tracking_number", nullable = false, length = 32)
    private String trackingNumber;

    @Column(name = "parcel_reference", length = 64)
    private String parcelReference;

    @Column(name = "delivery_job_id")
    private Long deliveryJobId;

    @Column(name = "exception_id")
    private Long exceptionId;

    @Column(name = "current_branch_id", nullable = false)
    private Long currentBranchId;

    @Column(name = "current_branch_code", nullable = false, length = 32)
    private String currentBranchCode;

    @Column(name = "current_branch_name", nullable = false, length = 150)
    private String currentBranchName;

    @Column(name = "origin_branch_id", nullable = false)
    private Long originBranchId;

    @Column(name = "origin_branch_code", nullable = false, length = 32)
    private String originBranchCode;

    @Column(name = "origin_branch_name", nullable = false, length = 150)
    private String originBranchName;

    @Column(name = "return_to_name", nullable = false, length = 150)
    private String returnToName;

    @Column(name = "return_to_phone", nullable = false, length = 40)
    private String returnToPhone;

    @Column(name = "return_address", nullable = false, length = 500)
    private String returnAddress;

    @Column(name = "reason", nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private ReturnTaskStatus status = ReturnTaskStatus.PENDING_ASSIGNMENT;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_courier_id")
    private CourierProfileEntity assignedCourier;

    @Column(name = "assigned_courier_code", length = 32)
    private String assignedCourierCode;

    @Column(name = "assigned_courier_name", length = 150)
    private String assignedCourierName;

    @Column(name = "return_manifest_id")
    private Long returnManifestId;

    @Column(name = "movement_notes", length = 1500)
    private String movementNotes;

    @Column(name = "sender_confirmed_by", length = 150)
    private String senderConfirmedBy;

    @Column(name = "sender_confirmation_reference", length = 500)
    private String senderConfirmationReference;

    @Column(name = "initiated_by_id", length = 120)
    private String initiatedById;

    @Column(name = "initiated_by_name", length = 150)
    private String initiatedByName;

    @Column(name = "initiated_at", nullable = false)
    private LocalDateTime initiatedAt;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "arrived_origin_branch_at")
    private LocalDateTime arrivedOriginBranchAt;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.initiatedAt == null) {
            this.initiatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReturnCode() {
        return returnCode;
    }

    public void setReturnCode(String returnCode) {
        this.returnCode = returnCode;
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

    public Long getDeliveryJobId() {
        return deliveryJobId;
    }

    public void setDeliveryJobId(Long deliveryJobId) {
        this.deliveryJobId = deliveryJobId;
    }

    public Long getExceptionId() {
        return exceptionId;
    }

    public void setExceptionId(Long exceptionId) {
        this.exceptionId = exceptionId;
    }

    public Long getCurrentBranchId() {
        return currentBranchId;
    }

    public void setCurrentBranchId(Long currentBranchId) {
        this.currentBranchId = currentBranchId;
    }

    public String getCurrentBranchCode() {
        return currentBranchCode;
    }

    public void setCurrentBranchCode(String currentBranchCode) {
        this.currentBranchCode = currentBranchCode;
    }

    public String getCurrentBranchName() {
        return currentBranchName;
    }

    public void setCurrentBranchName(String currentBranchName) {
        this.currentBranchName = currentBranchName;
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

    public String getReturnToName() {
        return returnToName;
    }

    public void setReturnToName(String returnToName) {
        this.returnToName = returnToName;
    }

    public String getReturnToPhone() {
        return returnToPhone;
    }

    public void setReturnToPhone(String returnToPhone) {
        this.returnToPhone = returnToPhone;
    }

    public String getReturnAddress() {
        return returnAddress;
    }

    public void setReturnAddress(String returnAddress) {
        this.returnAddress = returnAddress;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public ReturnTaskStatus getStatus() {
        return status;
    }

    public void setStatus(ReturnTaskStatus status) {
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

    public Long getReturnManifestId() {
        return returnManifestId;
    }

    public void setReturnManifestId(Long returnManifestId) {
        this.returnManifestId = returnManifestId;
    }

    public String getMovementNotes() {
        return movementNotes;
    }

    public void setMovementNotes(String movementNotes) {
        this.movementNotes = movementNotes;
    }

    public String getSenderConfirmedBy() {
        return senderConfirmedBy;
    }

    public void setSenderConfirmedBy(String senderConfirmedBy) {
        this.senderConfirmedBy = senderConfirmedBy;
    }

    public String getSenderConfirmationReference() {
        return senderConfirmationReference;
    }

    public void setSenderConfirmationReference(String senderConfirmationReference) {
        this.senderConfirmationReference = senderConfirmationReference;
    }

    public String getInitiatedById() {
        return initiatedById;
    }

    public void setInitiatedById(String initiatedById) {
        this.initiatedById = initiatedById;
    }

    public String getInitiatedByName() {
        return initiatedByName;
    }

    public void setInitiatedByName(String initiatedByName) {
        this.initiatedByName = initiatedByName;
    }

    public LocalDateTime getInitiatedAt() {
        return initiatedAt;
    }

    public void setInitiatedAt(LocalDateTime initiatedAt) {
        this.initiatedAt = initiatedAt;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }

    public LocalDateTime getDispatchedAt() {
        return dispatchedAt;
    }

    public void setDispatchedAt(LocalDateTime dispatchedAt) {
        this.dispatchedAt = dispatchedAt;
    }

    public LocalDateTime getArrivedOriginBranchAt() {
        return arrivedOriginBranchAt;
    }

    public void setArrivedOriginBranchAt(LocalDateTime arrivedOriginBranchAt) {
        this.arrivedOriginBranchAt = arrivedOriginBranchAt;
    }

    public LocalDateTime getReturnedAt() {
        return returnedAt;
    }

    public void setReturnedAt(LocalDateTime returnedAt) {
        this.returnedAt = returnedAt;
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
}

