package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.AttemptOutcome;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_attempts")
public class DeliveryAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_job_id", nullable = false)
    private DeliveryJob deliveryJob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id")
    private CourierAssignment assignment;

    @Column(name = "order_id", nullable = false, length = 64)
    private String orderId;

    @Column(name = "tracking_number", nullable = false, length = 32)
    private String trackingNumber;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 20)
    private AttemptOutcome outcome;

    @Column(name = "failure_reason", length = 200)
    private String failureReason;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "courier_id", nullable = false)
    private Long courierId;

    @Column(name = "courier_code", length = 32)
    private String courierCode;

    @Column(name = "courier_name", nullable = false, length = 150)
    private String courierName;

    @Column(name = "attempted_at", nullable = false)
    private LocalDateTime attemptedAt;

    @PrePersist
    protected void onCreate() {
        if (this.attemptedAt == null) {
            this.attemptedAt = LocalDateTime.now();
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

    public CourierAssignment getAssignment() {
        return assignment;
    }

    public void setAssignment(CourierAssignment assignment) {
        this.assignment = assignment;
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

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(int attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public AttemptOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(AttemptOutcome outcome) {
        this.outcome = outcome;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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

    public LocalDateTime getAttemptedAt() {
        return attemptedAt;
    }

    public void setAttemptedAt(LocalDateTime attemptedAt) {
        this.attemptedAt = attemptedAt;
    }
}
