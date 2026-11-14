package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.DeliveryPriority;
import com.swiftdrop.dispatch.entity.enums.PickupMethod;
import com.swiftdrop.dispatch.entity.enums.PickupTaskStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pickup_tasks")
public class PickupTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_code", nullable = false, unique = true, length = 32)
    private String taskCode;

    @Column(name = "order_id", nullable = false, unique = true, length = 64)
    private String orderId;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 32)
    private String trackingNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "pickup_method", nullable = false, length = 30)
    private PickupMethod pickupMethod = PickupMethod.COURIER_PICKUP;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private PickupTaskStatus status = PickupTaskStatus.PENDING_ASSIGNMENT;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private DeliveryPriority priority = DeliveryPriority.NORMAL;

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

    @Column(name = "same_branch", nullable = false)
    private boolean sameBranch = false;

    @Column(name = "merchant_name", length = 180)
    private String merchantName;

    @Column(name = "sender_name", nullable = false, length = 150)
    private String senderName;

    @Column(name = "sender_phone", nullable = false, length = 40)
    private String senderPhone;

    @Column(name = "pickup_address", nullable = false, length = 500)
    private String pickupAddress;

    @Column(name = "pickup_city", length = 100)
    private String pickupCity;

    @Column(name = "recipient_name", nullable = false, length = 150)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false, length = 40)
    private String recipientPhone;

    @Column(name = "dropoff_address", nullable = false, length = 500)
    private String dropoffAddress;

    @Column(name = "dropoff_city", length = 100)
    private String dropoffCity;

    @Column(name = "parcel_category", nullable = false, length = 150)
    private String parcelCategory;

    @Column(name = "parcel_size", nullable = false, length = 30)
    private String parcelSize = "MEDIUM";

    @Column(name = "weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal weightKg = BigDecimal.ONE;

    @Column(name = "fragile", nullable = false)
    private boolean fragile = false;

    @Column(name = "handling_notes", length = 1000)
    private String handlingNotes;

    @Column(name = "distance_km", nullable = false, precision = 10, scale = 2)
    private BigDecimal distanceKm = BigDecimal.ZERO;

    @Column(name = "delivery_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod = "PREPAID";

    @Column(name = "cod_amount", precision = 12, scale = 2)
    private BigDecimal codAmount = BigDecimal.ZERO;

    @Column(name = "assigned_courier_id")
    private Long assignedCourierId;

    @Column(name = "assigned_courier_code", length = 32)
    private String assignedCourierCode;

    @Column(name = "assigned_courier_name", length = 150)
    private String assignedCourierName;

    @Column(name = "parcel_reference", length = 64)
    private String parcelReference;

    @Column(name = "branch_confirmed_by_employee_id", length = 120)
    private String branchConfirmedByEmployeeId;

    @Column(name = "branch_confirmed_by_employee_name", length = 150)
    private String branchConfirmedByEmployeeName;

    @Column(name = "branch_confirmed_at")
    private LocalDateTime branchConfirmedAt;

    @Column(name = "picked_up_at")
    private LocalDateTime pickedUpAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTaskCode() {
        return taskCode;
    }

    public void setTaskCode(String taskCode) {
        this.taskCode = taskCode;
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

    public PickupMethod getPickupMethod() {
        return pickupMethod;
    }

    public void setPickupMethod(PickupMethod pickupMethod) {
        this.pickupMethod = pickupMethod;
    }

    public PickupTaskStatus getStatus() {
        return status;
    }

    public void setStatus(PickupTaskStatus status) {
        this.status = status;
    }

    public DeliveryPriority getPriority() {
        return priority;
    }

    public void setPriority(DeliveryPriority priority) {
        this.priority = priority;
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

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getSenderPhone() {
        return senderPhone;
    }

    public void setSenderPhone(String senderPhone) {
        this.senderPhone = senderPhone;
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public String getPickupCity() {
        return pickupCity;
    }

    public void setPickupCity(String pickupCity) {
        this.pickupCity = pickupCity;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getRecipientPhone() {
        return recipientPhone;
    }

    public void setRecipientPhone(String recipientPhone) {
        this.recipientPhone = recipientPhone;
    }

    public String getDropoffAddress() {
        return dropoffAddress;
    }

    public void setDropoffAddress(String dropoffAddress) {
        this.dropoffAddress = dropoffAddress;
    }

    public String getDropoffCity() {
        return dropoffCity;
    }

    public void setDropoffCity(String dropoffCity) {
        this.dropoffCity = dropoffCity;
    }

    public String getParcelCategory() {
        return parcelCategory;
    }

    public void setParcelCategory(String parcelCategory) {
        this.parcelCategory = parcelCategory;
    }

    public String getParcelSize() {
        return parcelSize;
    }

    public void setParcelSize(String parcelSize) {
        this.parcelSize = parcelSize;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public boolean isFragile() {
        return fragile;
    }

    public void setFragile(boolean fragile) {
        this.fragile = fragile;
    }

    public String getHandlingNotes() {
        return handlingNotes;
    }

    public void setHandlingNotes(String handlingNotes) {
        this.handlingNotes = handlingNotes;
    }

    public BigDecimal getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(BigDecimal distanceKm) {
        this.distanceKm = distanceKm;
    }

    public BigDecimal getDeliveryFee() {
        return deliveryFee;
    }

    public void setDeliveryFee(BigDecimal deliveryFee) {
        this.deliveryFee = deliveryFee;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public BigDecimal getCodAmount() {
        return codAmount;
    }

    public void setCodAmount(BigDecimal codAmount) {
        this.codAmount = codAmount;
    }

    public Long getAssignedCourierId() {
        return assignedCourierId;
    }

    public void setAssignedCourierId(Long assignedCourierId) {
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

    public String getParcelReference() {
        return parcelReference;
    }

    public void setParcelReference(String parcelReference) {
        this.parcelReference = parcelReference;
    }

    public String getBranchConfirmedByEmployeeId() {
        return branchConfirmedByEmployeeId;
    }

    public void setBranchConfirmedByEmployeeId(String branchConfirmedByEmployeeId) {
        this.branchConfirmedByEmployeeId = branchConfirmedByEmployeeId;
    }

    public String getBranchConfirmedByEmployeeName() {
        return branchConfirmedByEmployeeName;
    }

    public void setBranchConfirmedByEmployeeName(String branchConfirmedByEmployeeName) {
        this.branchConfirmedByEmployeeName = branchConfirmedByEmployeeName;
    }

    public LocalDateTime getBranchConfirmedAt() {
        return branchConfirmedAt;
    }

    public void setBranchConfirmedAt(LocalDateTime branchConfirmedAt) {
        this.branchConfirmedAt = branchConfirmedAt;
    }

    public LocalDateTime getPickedUpAt() {
        return pickedUpAt;
    }

    public void setPickedUpAt(LocalDateTime pickedUpAt) {
        this.pickedUpAt = pickedUpAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
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

