package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "proofs_of_delivery")
public class ProofOfDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_job_id", nullable = false, unique = true)
    private DeliveryJob deliveryJob;

    @Column(name = "assignment_id")
    private Long assignmentId;

    @Column(name = "order_id", nullable = false, length = 64)
    private String orderId;

    @Column(name = "tracking_number", nullable = false, length = 32)
    private String trackingNumber;

    @Column(name = "parcel_reference", nullable = false, length = 64)
    private String parcelReference;

    @Column(name = "recipient_name", nullable = false, length = 150)
    private String recipientName;

    @Enumerated(EnumType.STRING)
    @Column(name = "proof_type", nullable = false, length = 20)
    private ProofOfDeliveryType proofType = ProofOfDeliveryType.SIGNATURE;

    @Column(name = "signature_reference", length = 500)
    private String signatureReference;

    @Column(name = "photo_evidence_reference", length = 500)
    private String photoEvidenceReference;

    @Column(name = "otp_reference", length = 120)
    private String otpReference;

    @Column(name = "courier_id", nullable = false)
    private Long courierId;

    @Column(name = "courier_code", length = 32)
    private String courierCode;

    @Column(name = "courier_name", nullable = false, length = 150)
    private String courierName;

    @Column(name = "delivered_at", nullable = false)
    private LocalDateTime deliveredAt;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        if (this.deliveredAt == null) {
            this.deliveredAt = now;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DeliveryJob getDeliveryJob() {
        return deliveryJob;
    }

    public void setDeliveryJob(DeliveryJob deliveryJob) {
        this.deliveryJob = deliveryJob;
    }

    public Long getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(Long assignmentId) {
        this.assignmentId = assignmentId;
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

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public ProofOfDeliveryType getProofType() {
        return proofType;
    }

    public void setProofType(ProofOfDeliveryType proofType) {
        this.proofType = proofType;
    }

    public String getSignatureReference() {
        return signatureReference;
    }

    public void setSignatureReference(String signatureReference) {
        this.signatureReference = signatureReference;
    }

    public String getPhotoEvidenceReference() {
        return photoEvidenceReference;
    }

    public void setPhotoEvidenceReference(String photoEvidenceReference) {
        this.photoEvidenceReference = photoEvidenceReference;
    }

    public String getOtpReference() {
        return otpReference;
    }

    public void setOtpReference(String otpReference) {
        this.otpReference = otpReference;
    }

    public Long getCourierId() {
        return courierId;
    }

    public void setCourierId(Long courierId) {
        this.courierId = courierId;
    }

    public String getCourierCode() {
        return courierCode;
    }

    public void setCourierCode(String courierCode) {
        this.courierCode = courierCode;
    }

    public String getCourierName() {
        return courierName;
    }

    public void setCourierName(String courierName) {
        this.courierName = courierName;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
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
