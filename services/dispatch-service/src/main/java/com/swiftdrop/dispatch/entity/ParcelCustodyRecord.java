package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.CustodyEventType;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "parcel_custody_records")
public class ParcelCustodyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "custody_code", nullable = false, unique = true, length = 32)
    private String custodyCode;

    @Column(name = "order_id", nullable = false, length = 64)
    private String orderId;

    @Column(name = "tracking_number", nullable = false, length = 32)
    private String trackingNumber;

    @Column(name = "parcel_reference", nullable = false, length = 64)
    private String parcelReference;

    @Column(name = "manifest_id")
    private Long manifestId;

    @Column(name = "manifest_reference", length = 32)
    private String manifestReference;

    @Column(name = "return_task_id")
    private Long returnTaskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private CustodyEventType eventType;

    @Column(name = "responsible_branch_id")
    private Long responsibleBranchId;

    @Column(name = "responsible_branch_code", length = 32)
    private String responsibleBranchCode;

    @Column(name = "responsible_branch_name", length = 150)
    private String responsibleBranchName;

    @Column(name = "responsible_courier_id")
    private Long responsibleCourierId;

    @Column(name = "responsible_courier_code", length = 32)
    private String responsibleCourierCode;

    @Column(name = "responsible_courier_name", length = 150)
    private String responsibleCourierName;

    @Column(name = "responsible_employee_id", length = 120)
    private String responsibleEmployeeId;

    @Column(name = "responsible_employee_name", length = 150)
    private String responsibleEmployeeName;

    @Column(name = "handover_timestamp", nullable = false)
    private LocalDateTime handoverTimestamp;

    @Column(name = "discrepancy_notes", length = 1000)
    private String discrepancyNotes;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        if (this.handoverTimestamp == null) {
            this.handoverTimestamp = now;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCustodyCode() {
        return custodyCode;
    }

    public void setCustodyCode(String custodyCode) {
        this.custodyCode = custodyCode;
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

    public Long getManifestId() {
        return manifestId;
    }

    public void setManifestId(Long manifestId) {
        this.manifestId = manifestId;
    }

    public String getManifestReference() {
        return manifestReference;
    }

    public void setManifestReference(String manifestReference) {
        this.manifestReference = manifestReference;
    }

    public Long getReturnTaskId() {
        return returnTaskId;
    }

    public void setReturnTaskId(Long returnTaskId) {
        this.returnTaskId = returnTaskId;
    }

    public CustodyEventType getEventType() {
        return eventType;
    }

    public void setEventType(CustodyEventType eventType) {
        this.eventType = eventType;
    }

    public Long getResponsibleBranchId() {
        return responsibleBranchId;
    }

    public void setResponsibleBranchId(Long responsibleBranchId) {
        this.responsibleBranchId = responsibleBranchId;
    }

    public String getResponsibleBranchCode() {
        return responsibleBranchCode;
    }

    public void setResponsibleBranchCode(String responsibleBranchCode) {
        this.responsibleBranchCode = responsibleBranchCode;
    }

    public String getResponsibleBranchName() {
        return responsibleBranchName;
    }

    public void setResponsibleBranchName(String responsibleBranchName) {
        this.responsibleBranchName = responsibleBranchName;
    }

    public Long getResponsibleCourierId() {
        return responsibleCourierId;
    }

    public void setResponsibleCourierId(Long responsibleCourierId) {
        this.responsibleCourierId = responsibleCourierId;
    }

    public String getResponsibleCourierCode() {
        return responsibleCourierCode;
    }

    public void setResponsibleCourierCode(String responsibleCourierCode) {
        this.responsibleCourierCode = responsibleCourierCode;
    }

    public String getResponsibleCourierName() {
        return responsibleCourierName;
    }

    public void setResponsibleCourierName(String responsibleCourierName) {
        this.responsibleCourierName = responsibleCourierName;
    }

    public String getResponsibleEmployeeId() {
        return responsibleEmployeeId;
    }

    public void setResponsibleEmployeeId(String responsibleEmployeeId) {
        this.responsibleEmployeeId = responsibleEmployeeId;
    }

    public String getResponsibleEmployeeName() {
        return responsibleEmployeeName;
    }

    public void setResponsibleEmployeeName(String responsibleEmployeeName) {
        this.responsibleEmployeeName = responsibleEmployeeName;
    }

    public LocalDateTime getHandoverTimestamp() {
        return handoverTimestamp;
    }

    public void setHandoverTimestamp(LocalDateTime handoverTimestamp) {
        this.handoverTimestamp = handoverTimestamp;
    }

    public String getDiscrepancyNotes() {
        return discrepancyNotes;
    }

    public void setDiscrepancyNotes(String discrepancyNotes) {
        this.discrepancyNotes = discrepancyNotes;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

