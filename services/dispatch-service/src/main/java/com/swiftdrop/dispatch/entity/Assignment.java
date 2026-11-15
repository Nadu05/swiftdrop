package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA entity representing a courier-to-order delivery assignment.
 * Maintains operational delivery state and maps locally to the assigned Courier.
 * External references to Order Service (orderId), Organization Service (branchId),
 * and Identity Service (assignedBy) are stored as plain identifiers.
 */
@Entity
@Table(name = "assignments")
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_code", nullable = false, length = 50, unique = true)
    private String assignmentCode;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "courier_id", nullable = false)
    private Courier courier;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "assigned_by")
    private Long assignedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssignmentStatus status = AssignmentStatus.ASSIGNED;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "delivery_attempts", nullable = false)
    private Integer deliveryAttempts = 1;

    @Column(name = "delivery_notes", length = 1000)
    private String deliveryNotes;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "tracking_number", length = 100)
    private String trackingNumber;

    @Column(name = "recipient_name", length = 255)
    private String recipientName;

    @Column(name = "recipient_phone", length = 50)
    private String recipientPhone;

    @Column(name = "delivery_address", length = 500)
    private String deliveryAddress;

    @Column(name = "recipient_city", length = 100)
    private String recipientCity;

    @Column(name = "merchant_name", length = 255)
    private String merchantName;

    @Column(name = "merchant_phone", length = 50)
    private String merchantPhone;

    @Column(name = "priority", length = 20)
    private String priority = "NORMAL";

    @Column(name = "package_category", length = 100)
    private String packageCategory;

    @Column(name = "package_weight", length = 50)
    private String packageWeight;

    @OneToOne(mappedBy = "assignment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private DeliveryProof deliveryProof;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (status == null) {
            status = AssignmentStatus.ASSIGNED;
        }
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
        if (deliveryAttempts == null) {
            deliveryAttempts = 1;
        }
        if (priority == null) {
            priority = "NORMAL";
        }
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Assignment() {}

    public Assignment(String assignmentCode, Long orderId, Courier courier,
                      Long branchId, Long assignedBy, AssignmentStatus status,
                      LocalDateTime assignedAt) {
        this.assignmentCode = assignmentCode;
        this.orderId = orderId;
        this.courier = courier;
        this.branchId = branchId;
        this.assignedBy = assignedBy;
        this.status = status != null ? status : AssignmentStatus.ASSIGNED;
        this.assignedAt = assignedAt != null ? assignedAt : LocalDateTime.now();
    }

    // --- Getters and Setters ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAssignmentCode() {
        return assignmentCode;
    }

    public void setAssignmentCode(String assignmentCode) {
        this.assignmentCode = assignmentCode;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Courier getCourier() {
        return courier;
    }

    public void setCourier(Courier courier) {
        this.courier = courier;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Long getAssignedBy() {
        return assignedBy;
    }

    public void setAssignedBy(Long assignedBy) {
        this.assignedBy = assignedBy;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = status;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
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

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public Integer getDeliveryAttempts() {
        return deliveryAttempts != null ? deliveryAttempts : 1;
    }

    public void setDeliveryAttempts(Integer deliveryAttempts) {
        this.deliveryAttempts = deliveryAttempts;
    }

    public String getDeliveryNotes() {
        return deliveryNotes;
    }

    public void setDeliveryNotes(String deliveryNotes) {
        this.deliveryNotes = deliveryNotes;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
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

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public String getRecipientCity() {
        return recipientCity;
    }

    public void setRecipientCity(String recipientCity) {
        this.recipientCity = recipientCity;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public String getMerchantPhone() {
        return merchantPhone;
    }

    public void setMerchantPhone(String merchantPhone) {
        this.merchantPhone = merchantPhone;
    }

    public String getPriority() {
        return priority != null ? priority : "NORMAL";
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getPackageCategory() {
        return packageCategory;
    }

    public void setPackageCategory(String packageCategory) {
        this.packageCategory = packageCategory;
    }

    public String getPackageWeight() {
        return packageWeight;
    }

    public void setPackageWeight(String packageWeight) {
        this.packageWeight = packageWeight;
    }

    public DeliveryProof getDeliveryProof() {
        return deliveryProof;
    }

    public void setDeliveryProof(DeliveryProof deliveryProof) {
        this.deliveryProof = deliveryProof;
        if (deliveryProof != null && deliveryProof.getAssignment() != this) {
            deliveryProof.setAssignment(this);
        }
    }
}

