package com.swiftdrop.order.entity;

import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A customer (or later, merchant) delivery order. The Order service owns the
 * official status of the delivery.
 *
 * <p>{@code customerId} and {@code branchId} are references to data owned by the
 * Identity and Organization services; they are plain ids on purpose (no foreign
 * keys across service databases).
 */
@Entity
@Table(name = "delivery_orders")
public class DeliveryOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 30, updatable = false)
    private String trackingNumber;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @Column(name = "branch_id")
    private Long branchId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status = OrderStatus.CREATED;

    @Column(name = "pickup_address", nullable = false, length = 500)
    private String pickupAddress;

    @Column(name = "pickup_contact_name", nullable = false, length = 150)
    private String pickupContactName;

    @Column(name = "pickup_contact_phone", nullable = false, length = 30)
    private String pickupContactPhone;

    @Column(name = "dropoff_address", nullable = false, length = 500)
    private String dropoffAddress;

    @Column(name = "dropoff_contact_name", nullable = false, length = 150)
    private String dropoffContactName;

    @Column(name = "dropoff_contact_phone", nullable = false, length = 30)
    private String dropoffContactPhone;

    @Column(name = "parcel_description", length = 500)
    private String parcelDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "parcel_size", nullable = false, length = 20)
    private ParcelSize parcelSize;

    @Column(name = "weight_kg", nullable = false, precision = 8, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "delivery_instructions", length = 1000)
    private String deliveryInstructions;

    @Column(name = "delivery_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal deliveryFee;

    @Column(nullable = false, length = 3)
    private String currency = "LKR";

    @Column(name = "distance_km", precision = 8, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "idempotency_key", length = 64, updatable = false)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DeliveryOrder() {
        // required by JPA
    }

    public DeliveryOrder(Long customerId, String trackingNumber) {
        this.customerId = customerId;
        this.trackingNumber = trackingNumber;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getTrackingNumber() { return trackingNumber; }
    public Long getCustomerId() { return customerId; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public String getPickupAddress() { return pickupAddress; }
    public void setPickupAddress(String pickupAddress) { this.pickupAddress = pickupAddress; }

    public String getPickupContactName() { return pickupContactName; }
    public void setPickupContactName(String pickupContactName) { this.pickupContactName = pickupContactName; }

    public String getPickupContactPhone() { return pickupContactPhone; }
    public void setPickupContactPhone(String pickupContactPhone) { this.pickupContactPhone = pickupContactPhone; }

    public String getDropoffAddress() { return dropoffAddress; }
    public void setDropoffAddress(String dropoffAddress) { this.dropoffAddress = dropoffAddress; }

    public String getDropoffContactName() { return dropoffContactName; }
    public void setDropoffContactName(String dropoffContactName) { this.dropoffContactName = dropoffContactName; }

    public String getDropoffContactPhone() { return dropoffContactPhone; }
    public void setDropoffContactPhone(String dropoffContactPhone) { this.dropoffContactPhone = dropoffContactPhone; }

    public String getParcelDescription() { return parcelDescription; }
    public void setParcelDescription(String parcelDescription) { this.parcelDescription = parcelDescription; }

    public ParcelSize getParcelSize() { return parcelSize; }
    public void setParcelSize(ParcelSize parcelSize) { this.parcelSize = parcelSize; }

    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }

    public String getDeliveryInstructions() { return deliveryInstructions; }
    public void setDeliveryInstructions(String deliveryInstructions) { this.deliveryInstructions = deliveryInstructions; }

    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public void setDeliveryFee(BigDecimal deliveryFee) { this.deliveryFee = deliveryFee; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getDistanceKm() { return distanceKm; }
    public void setDistanceKm(BigDecimal distanceKm) { this.distanceKm = distanceKm; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
