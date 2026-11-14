package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.DispatcherDecisionAction;
import com.swiftdrop.dispatch.entity.enums.ExceptionStatus;
import com.swiftdrop.dispatch.entity.enums.ExceptionType;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_exceptions")
public class DeliveryException {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exception_code", nullable = false, unique = true, length = 32)
    private String exceptionCode;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "delivery_job_id", nullable = false)
    private DeliveryJob deliveryJob;

    @Column(name = "order_id", nullable = false, length = 64)
    private String orderId;

    @Column(name = "tracking_number", nullable = false, length = 32)
    private String trackingNumber;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "branch_code", nullable = false, length = 32)
    private String branchCode;

    @Column(name = "branch_name", nullable = false, length = 150)
    private String branchName;

    @Enumerated(EnumType.STRING)
    @Column(name = "exception_type", nullable = false, length = 50)
    private ExceptionType exceptionType = ExceptionType.MAX_ATTEMPTS_EXCEEDED;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ExceptionStatus status = ExceptionStatus.PENDING_DECISION;

    @Column(name = "failed_attempt_count", nullable = false)
    private int failedAttemptCount = 3;

    @Column(name = "last_failure_reason", length = 250)
    private String lastFailureReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision_action", length = 50)
    private DispatcherDecisionAction decisionAction;

    @Column(name = "decision_reason", length = 1000)
    private String decisionReason;

    @Column(name = "decided_by_id", length = 120)
    private String decidedById;

    @Column(name = "decided_by_name", length = 150)
    private String decidedByName;

    @Column(name = "decided_by_role", length = 40)
    private String decidedByRole;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

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

    public String getExceptionCode() {
        return exceptionCode;
    }

    public void setExceptionCode(String exceptionCode) {
        this.exceptionCode = exceptionCode;
    }

    public DeliveryJob getDeliveryJob() {
        return deliveryJob;
    }

    public void setDeliveryJob(DeliveryJob deliveryJob) {
        this.deliveryJob = deliveryJob;
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

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public ExceptionType getExceptionType() {
        return exceptionType;
    }

    public void setExceptionType(ExceptionType exceptionType) {
        this.exceptionType = exceptionType;
    }

    public ExceptionStatus getStatus() {
        return status;
    }

    public void setStatus(ExceptionStatus status) {
        this.status = status;
    }

    public int getFailedAttemptCount() {
        return failedAttemptCount;
    }

    public void setFailedAttemptCount(int failedAttemptCount) {
        this.failedAttemptCount = failedAttemptCount;
    }

    public String getLastFailureReason() {
        return lastFailureReason;
    }

    public void setLastFailureReason(String lastFailureReason) {
        this.lastFailureReason = lastFailureReason;
    }

    public DispatcherDecisionAction getDecisionAction() {
        return decisionAction;
    }

    public void setDecisionAction(DispatcherDecisionAction decisionAction) {
        this.decisionAction = decisionAction;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public void setDecisionReason(String decisionReason) {
        this.decisionReason = decisionReason;
    }

    public String getDecidedById() {
        return decidedById;
    }

    public void setDecidedById(String decidedById) {
        this.decidedById = decidedById;
    }

    public String getDecidedByName() {
        return decidedByName;
    }

    public void setDecidedByName(String decidedByName) {
        this.decidedByName = decidedByName;
    }

    public String getDecidedByRole() {
        return decidedByRole;
    }

    public void setDecidedByRole(String decidedByRole) {
        this.decidedByRole = decidedByRole;
    }

    public LocalDateTime getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(LocalDateTime decidedAt) {
        this.decidedAt = decidedAt;
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
