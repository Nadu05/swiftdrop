package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Courier-facing details of one {@link Assignment}: a minimal order snapshot plus the operational
 * facts the courier records (pickup, completion, proof of delivery, failure).
 *
 * <p>Kept in its own table (V3) so the assignment domain is unchanged. The order snapshot is copied
 * from the Order service when the assignment is created; Dispatch never reads the Order database.
 */
@Entity
@Table(name = "courier_deliveries")
public class CourierDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false, unique = true)
    private Assignment assignment;

    // --- Order snapshot ---
    @Column(name = "tracking_number", length = 50)
    private String trackingNumber;

    @Column(length = 20)
    private String priority;

    @Column(name = "recipient_name")
    private String recipientName;

    @Column(name = "recipient_phone", length = 50)
    private String recipientPhone;

    @Column(name = "delivery_address", length = 500)
    private String deliveryAddress;

    @Column(name = "delivery_city")
    private String deliveryCity;

    @Column(name = "pickup_name")
    private String pickupName;

    @Column(name = "pickup_phone", length = 50)
    private String pickupPhone;

    @Column(name = "pickup_address", length = 500)
    private String pickupAddress;

    @Column(name = "pickup_city")
    private String pickupCity;

    @Column(name = "package_type", length = 50)
    private String packageType;

    @Column(name = "weight_kg", precision = 8, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "handling_notes", length = 1000)
    private String handlingNotes;

    @Column(name = "payout_amount", precision = 10, scale = 2)
    private BigDecimal payoutAmount;

    // --- Operational facts ---
    @Column(name = "picked_up_at")
    private Instant pickedUpAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "pod_type", length = 20)
    private ProofOfDeliveryType podType;

    @Column(name = "pod_received_by", length = 120)
    private String podReceivedBy;

    @Column(name = "pod_reference", length = 100)
    private String podReference;

    @Column(name = "failure_reason", length = 100)
    private String failureReason;

    @Column(name = "failure_notes", length = 500)
    private String failureNotes;

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public CourierDelivery() {
    }

    public CourierDelivery(Assignment assignment) {
        this.assignment = assignment;
    }

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Assignment getAssignment() { return assignment; }
    public void setAssignment(Assignment assignment) { this.assignment = assignment; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getRecipientPhone() { return recipientPhone; }
    public void setRecipientPhone(String recipientPhone) { this.recipientPhone = recipientPhone; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getDeliveryCity() { return deliveryCity; }
    public void setDeliveryCity(String deliveryCity) { this.deliveryCity = deliveryCity; }

    public String getPickupName() { return pickupName; }
    public void setPickupName(String pickupName) { this.pickupName = pickupName; }

    public String getPickupPhone() { return pickupPhone; }
    public void setPickupPhone(String pickupPhone) { this.pickupPhone = pickupPhone; }

    public String getPickupAddress() { return pickupAddress; }
    public void setPickupAddress(String pickupAddress) { this.pickupAddress = pickupAddress; }

    public String getPickupCity() { return pickupCity; }
    public void setPickupCity(String pickupCity) { this.pickupCity = pickupCity; }

    public String getPackageType() { return packageType; }
    public void setPackageType(String packageType) { this.packageType = packageType; }

    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }

    public String getHandlingNotes() { return handlingNotes; }
    public void setHandlingNotes(String handlingNotes) { this.handlingNotes = handlingNotes; }

    public BigDecimal getPayoutAmount() { return payoutAmount; }
    public void setPayoutAmount(BigDecimal payoutAmount) { this.payoutAmount = payoutAmount; }

    public Instant getPickedUpAt() { return pickedUpAt; }
    public void setPickedUpAt(Instant pickedUpAt) { this.pickedUpAt = pickedUpAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public ProofOfDeliveryType getPodType() { return podType; }
    public void setPodType(ProofOfDeliveryType podType) { this.podType = podType; }

    public String getPodReceivedBy() { return podReceivedBy; }
    public void setPodReceivedBy(String podReceivedBy) { this.podReceivedBy = podReceivedBy; }

    public String getPodReference() { return podReference; }
    public void setPodReference(String podReference) { this.podReference = podReference; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }

    public String getFailureNotes() { return failureNotes; }
    public void setFailureNotes(String failureNotes) { this.failureNotes = failureNotes; }


    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
