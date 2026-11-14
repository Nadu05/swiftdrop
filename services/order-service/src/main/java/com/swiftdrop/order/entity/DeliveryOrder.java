package com.swiftdrop.order.entity;

import com.swiftdrop.order.entity.enums.*;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "delivery_orders")
public class DeliveryOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 32)
    private String trackingNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_source_type", nullable = false, length = 30)
    private OrderSourceType orderSourceType = OrderSourceType.CUSTOMER;

    @Column(name = "customer_user_id", length = 100)
    private String customerUserId;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "merchant_organization_id", length = 100)
    private String merchantOrganizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "pickup_method", nullable = false, length = 30)
    private PickupMethod pickupMethod = PickupMethod.COURIER_PICKUP;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "address", column = @Column(name = "pickup_address", nullable = false, length = 500)),
            @AttributeOverride(name = "city", column = @Column(name = "pickup_city", length = 120)),
            @AttributeOverride(name = "postalCode", column = @Column(name = "pickup_postal_code", length = 30)),
            @AttributeOverride(name = "latitude", column = @Column(name = "pickup_latitude", nullable = false)),
            @AttributeOverride(name = "longitude", column = @Column(name = "pickup_longitude", nullable = false)),
            @AttributeOverride(name = "contactName", column = @Column(name = "pickup_contact_name", nullable = false, length = 200)),
            @AttributeOverride(name = "contactPhone", column = @Column(name = "pickup_contact_phone", nullable = false, length = 50)),
            @AttributeOverride(name = "contactEmail", column = @Column(name = "pickup_contact_email", length = 255))
    })
    private DeliveryAddress pickupDetails = new DeliveryAddress();

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "address", column = @Column(name = "dropoff_address", nullable = false, length = 500)),
            @AttributeOverride(name = "city", column = @Column(name = "dropoff_city", length = 120)),
            @AttributeOverride(name = "postalCode", column = @Column(name = "dropoff_postal_code", length = 30)),
            @AttributeOverride(name = "latitude", column = @Column(name = "destination_latitude", nullable = false)),
            @AttributeOverride(name = "longitude", column = @Column(name = "destination_longitude", nullable = false)),
            @AttributeOverride(name = "contactName", column = @Column(name = "dropoff_contact_name", nullable = false, length = 200)),
            @AttributeOverride(name = "contactPhone", column = @Column(name = "dropoff_contact_phone", nullable = false, length = 50)),
            @AttributeOverride(name = "contactEmail", column = @Column(name = "dropoff_contact_email", length = 255))
    })
    private DeliveryAddress dropoffDetails = new DeliveryAddress();

    @Column(name = "origin_branch_id", nullable = false)
    private Long originBranchId;

    @Column(name = "origin_branch_code", nullable = false, length = 50)
    private String originBranchCode;

    @Column(name = "origin_branch_name", nullable = false, length = 200)
    private String originBranchName;

    @Column(name = "destination_branch_id", nullable = false)
    private Long destinationBranchId;

    @Column(name = "destination_branch_code", nullable = false, length = 50)
    private String destinationBranchCode;

    @Column(name = "destination_branch_name", nullable = false, length = 200)
    private String destinationBranchName;

    @Column(name = "same_branch", nullable = false)
    private boolean sameBranch;

    @Column(name = "distance_km", nullable = false, precision = 8, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "quote_reference", length = 64)
    private String quoteReference;

    @Column(name = "base_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFee;

    @Column(name = "distance_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal distanceFee;

    @Column(name = "weight_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal weightFee;

    @Column(name = "size_surcharge", nullable = false, precision = 10, scale = 2)
    private BigDecimal sizeSurcharge;

    @Column(name = "delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal deliveryFee;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "LKR";

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private PaymentMethod paymentMethod = PaymentMethod.PREPAID;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 40)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING_PAYMENT;

    @Column(name = "cod_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal codAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private OrderLifecycleStatus status = OrderLifecycleStatus.CREATED;

    @Column(name = "failed_attempt_count", nullable = false)
    private int failedAttemptCount = 0;

    @Column(name = "delivery_instructions", length = 1000)
    private String deliveryInstructions;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "assigned_courier_id", length = 100)
    private String assignedCourierId;

    @Column(name = "assigned_courier_name", length = 200)
    private String assignedCourierName;

    @Column(name = "assigned_courier_phone", length = 50)
    private String assignedCourierPhone;

    @Column(name = "assigned_courier_vehicle", length = 100)
    private String assignedCourierVehicle;

    @Column(name = "recipient_confirmed_name", length = 200)
    private String recipientConfirmedName;

    @Column(name = "signature_reference", length = 500)
    private String signatureReference;

    @Column(name = "photo_evidence_url", length = 500)
    private String photoEvidenceUrl;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Parcel parcel;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("recordedAt ASC, id ASC")
    private List<TrackingEvent> trackingEvents = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC, id ASC")
    private List<PaymentReference> paymentReferences = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void attachParcel(Parcel parcel) {
        this.parcel = parcel;
        if (parcel != null) {
            parcel.setOrder(this);
        }
    }

    public void addTrackingEvent(TrackingEvent event) {
        event.setOrder(this);
        this.trackingEvents.add(event);
    }

    public void addPaymentReference(PaymentReference ref) {
        ref.setOrder(this);
        this.paymentReferences.add(ref);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public OrderSourceType getOrderSourceType() {
        return orderSourceType;
    }

    public void setOrderSourceType(OrderSourceType orderSourceType) {
        this.orderSourceType = orderSourceType;
    }

    public String getCustomerUserId() {
        return customerUserId;
    }

    public void setCustomerUserId(String customerUserId) {
        this.customerUserId = customerUserId;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getMerchantOrganizationId() {
        return merchantOrganizationId;
    }

    public void setMerchantOrganizationId(String merchantOrganizationId) {
        this.merchantOrganizationId = merchantOrganizationId;
    }

    public PickupMethod getPickupMethod() {
        return pickupMethod;
    }

    public void setPickupMethod(PickupMethod pickupMethod) {
        this.pickupMethod = pickupMethod;
    }

    public DeliveryAddress getPickupDetails() {
        return pickupDetails;
    }

    public void setPickupDetails(DeliveryAddress pickupDetails) {
        this.pickupDetails = pickupDetails;
    }

    public DeliveryAddress getDropoffDetails() {
        return dropoffDetails;
    }

    public void setDropoffDetails(DeliveryAddress dropoffDetails) {
        this.dropoffDetails = dropoffDetails;
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

    public boolean isSameBranch() {
        return sameBranch;
    }

    public void setSameBranch(boolean sameBranch) {
        this.sameBranch = sameBranch;
    }

    public BigDecimal getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(BigDecimal distanceKm) {
        this.distanceKm = distanceKm;
    }

    public String getQuoteReference() {
        return quoteReference;
    }

    public void setQuoteReference(String quoteReference) {
        this.quoteReference = quoteReference;
    }

    public BigDecimal getBaseFee() {
        return baseFee;
    }

    public void setBaseFee(BigDecimal baseFee) {
        this.baseFee = baseFee;
    }

    public BigDecimal getDistanceFee() {
        return distanceFee;
    }

    public void setDistanceFee(BigDecimal distanceFee) {
        this.distanceFee = distanceFee;
    }

    public BigDecimal getWeightFee() {
        return weightFee;
    }

    public void setWeightFee(BigDecimal weightFee) {
        this.weightFee = weightFee;
    }

    public BigDecimal getSizeSurcharge() {
        return sizeSurcharge;
    }

    public void setSizeSurcharge(BigDecimal sizeSurcharge) {
        this.sizeSurcharge = sizeSurcharge;
    }

    public BigDecimal getDeliveryFee() {
        return deliveryFee;
    }

    public void setDeliveryFee(BigDecimal deliveryFee) {
        this.deliveryFee = deliveryFee;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public BigDecimal getCodAmount() {
        return codAmount;
    }

    public void setCodAmount(BigDecimal codAmount) {
        this.codAmount = codAmount;
    }

    public OrderLifecycleStatus getStatus() {
        return status;
    }

    public void setStatus(OrderLifecycleStatus status) {
        this.status = status;
    }

    public int getFailedAttemptCount() {
        return failedAttemptCount;
    }

    public void setFailedAttemptCount(int failedAttemptCount) {
        this.failedAttemptCount = failedAttemptCount;
    }

    public String getDeliveryInstructions() {
        return deliveryInstructions;
    }

    public void setDeliveryInstructions(String deliveryInstructions) {
        this.deliveryInstructions = deliveryInstructions;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public String getAssignedCourierId() {
        return assignedCourierId;
    }

    public void setAssignedCourierId(String assignedCourierId) {
        this.assignedCourierId = assignedCourierId;
    }

    public String getAssignedCourierName() {
        return assignedCourierName;
    }

    public void setAssignedCourierName(String assignedCourierName) {
        this.assignedCourierName = assignedCourierName;
    }

    public String getAssignedCourierPhone() {
        return assignedCourierPhone;
    }

    public void setAssignedCourierPhone(String assignedCourierPhone) {
        this.assignedCourierPhone = assignedCourierPhone;
    }

    public String getAssignedCourierVehicle() {
        return assignedCourierVehicle;
    }

    public void setAssignedCourierVehicle(String assignedCourierVehicle) {
        this.assignedCourierVehicle = assignedCourierVehicle;
    }

    public String getRecipientConfirmedName() {
        return recipientConfirmedName;
    }

    public void setRecipientConfirmedName(String recipientConfirmedName) {
        this.recipientConfirmedName = recipientConfirmedName;
    }

    public String getSignatureReference() {
        return signatureReference;
    }

    public void setSignatureReference(String signatureReference) {
        this.signatureReference = signatureReference;
    }

    public String getPhotoEvidenceUrl() {
        return photoEvidenceUrl;
    }

    public void setPhotoEvidenceUrl(String photoEvidenceUrl) {
        this.photoEvidenceUrl = photoEvidenceUrl;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public Parcel getParcel() {
        return parcel;
    }

    public void setParcel(Parcel parcel) {
        this.parcel = parcel;
        if (parcel != null && parcel.getOrder() != this) {
            parcel.setOrder(this);
        }
    }

    public List<TrackingEvent> getTrackingEvents() {
        return trackingEvents;
    }

    public void setTrackingEvents(List<TrackingEvent> trackingEvents) {
        this.trackingEvents = trackingEvents;
    }

    public List<PaymentReference> getPaymentReferences() {
        return paymentReferences;
    }

    public void setPaymentReferences(List<PaymentReference> paymentReferences) {
        this.paymentReferences = paymentReferences;
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

