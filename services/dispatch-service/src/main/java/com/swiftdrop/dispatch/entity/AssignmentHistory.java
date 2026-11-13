package com.swiftdrop.dispatch.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA entity providing an immutable audit trail of courier assignments and reassignments.
 * Maintains historical references to both the previous courier and the newly assigned courier.
 * External references to Identity Service (changedBy) are stored as plain identifiers.
 */
@Entity
@Table(name = "assignment_history")
public class AssignmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_courier_id")
    private Courier previousCourier;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "new_courier_id", nullable = false)
    private Courier newCourier;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "change_reason", length = 1000)
    private String changeReason;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    @PrePersist
    protected void onCreate() {
        if (changedAt == null) {
            changedAt = LocalDateTime.now();
        }
    }

    public AssignmentHistory() {}

    public AssignmentHistory(Assignment assignment, Courier previousCourier, Courier newCourier,
                             Long changedBy, String changeReason) {
        this.assignment = assignment;
        this.previousCourier = previousCourier;
        this.newCourier = newCourier;
        this.changedBy = changedBy;
        this.changeReason = changeReason;
        this.changedAt = LocalDateTime.now();
    }

    public AssignmentHistory(Assignment assignment, Courier previousCourier, Courier newCourier,
                             Long changedBy, String changeReason, LocalDateTime changedAt) {
        this.assignment = assignment;
        this.previousCourier = previousCourier;
        this.newCourier = newCourier;
        this.changedBy = changedBy;
        this.changeReason = changeReason;
        this.changedAt = changedAt != null ? changedAt : LocalDateTime.now();
    }

    // --- Getters and Setters ---

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

    public Courier getPreviousCourier() {
        return previousCourier;
    }

    public void setPreviousCourier(Courier previousCourier) {
        this.previousCourier = previousCourier;
    }

    public Courier getNewCourier() {
        return newCourier;
    }

    public void setNewCourier(Courier newCourier) {
        this.newCourier = newCourier;
    }

    public Long getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(Long changedBy) {
        this.changedBy = changedBy;
    }

    public String getChangeReason() {
        return changeReason;
    }

    public void setChangeReason(String changeReason) {
        this.changeReason = changeReason;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.changedAt = changedAt;
    }
}

