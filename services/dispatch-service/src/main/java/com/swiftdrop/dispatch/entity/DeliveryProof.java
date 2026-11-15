package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA entity representing the proof-of-delivery (POD) recorded upon successful delivery fulfillment.
 * Stores recipient confirmation, verification mechanism, reference key, and optional media URL.
 */
@Entity
@Table(name = "delivery_proofs")
public class DeliveryProof {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false, unique = true)
    private Assignment assignment;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Enumerated(EnumType.STRING)
    @Column(name = "pod_type", nullable = false, length = 20)
    private ProofOfDeliveryType podType = ProofOfDeliveryType.SIGNATURE;

    @Column(name = "confirmation_details", length = 1000)
    private String confirmationDetails;

    @Column(name = "pod_reference", nullable = false, unique = true, length = 100)
    private String podReference;

    @Column(name = "photo_url", length = 1000)
    private String photoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (podType == null) {
            podType = ProofOfDeliveryType.SIGNATURE;
        }
    }

    public DeliveryProof() {}

    public DeliveryProof(Assignment assignment, String recipientName, ProofOfDeliveryType podType,
                         String confirmationDetails, String podReference, String photoUrl) {
        this.assignment = assignment;
        this.recipientName = recipientName;
        this.podType = podType != null ? podType : ProofOfDeliveryType.SIGNATURE;
        this.confirmationDetails = confirmationDetails;
        this.podReference = podReference;
        this.photoUrl = photoUrl;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Assignment getAssignment() {
        return assignment;
    }

    public void setAssignment(Assignment assignment) {
        this.assignment = assignment;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public ProofOfDeliveryType getPodType() {
        return podType;
    }

    public void setPodType(ProofOfDeliveryType podType) {
        this.podType = podType;
    }

    public String getConfirmationDetails() {
        return confirmationDetails;
    }

    public void setConfirmationDetails(String confirmationDetails) {
        this.confirmationDetails = confirmationDetails;
    }

    public String getPodReference() {
        return podReference;
    }

    public void setPodReference(String podReference) {
        this.podReference = podReference;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

