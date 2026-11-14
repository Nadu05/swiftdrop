package com.swiftdrop.dispatch.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "courier_assignment_history")
public class AssignmentHistoryRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false)
    private CourierAssignment assignment;

    @Column(name = "from_courier_id")
    private Long fromCourierId;

    @Column(name = "from_courier_name", length = 150)
    private String fromCourierName;

    @Column(name = "to_courier_id", nullable = false)
    private Long toCourierId;

    @Column(name = "to_courier_name", nullable = false, length = 150)
    private String toCourierName;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "assigned_by", nullable = false, length = 150)
    private String assignedBy;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        if (this.recordedAt == null) {
            this.recordedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public CourierAssignment getAssignment() {
        return assignment;
    }

    public void setAssignment(CourierAssignment assignment) {
        this.assignment = assignment;
    }

    public Long getFromCourierId() {
        return fromCourierId;
    }

    public void setFromCourierId(Long fromCourierId) {
        this.fromCourierId = fromCourierId;
    }

    public String getFromCourierName() {
        return fromCourierName;
    }

    public void setFromCourierName(String fromCourierName) {
        this.fromCourierName = fromCourierName;
    }

    public Long getToCourierId() {
        return toCourierId;
    }

    public void setToCourierId(Long toCourierId) {
        this.toCourierId = toCourierId;
    }

    public String getToCourierName() {
        return toCourierName;
    }

    public void setToCourierName(String toCourierName) {
        this.toCourierName = toCourierName;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getAssignedBy() {
        return assignedBy;
    }

    public void setAssignedBy(String assignedBy) {
        this.assignedBy = assignedBy;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
}
