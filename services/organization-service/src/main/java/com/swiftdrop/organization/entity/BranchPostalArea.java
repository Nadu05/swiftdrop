package com.swiftdrop.organization.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA entity representing a historical or active Postal Area assignment to a Branch.
 * Active exclusivity is enforced by a partial unique index on (postal_area_id) WHERE is_active = true.
 */
@Entity
@Table(name = "branch_postal_areas")
public class BranchPostalArea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "postal_area_id", nullable = false)
    private PostalArea postalArea;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "assigned_by", nullable = false, length = 255)
    private String assignedBy;

    @Column(name = "unassigned_at")
    private LocalDateTime unassignedAt;

    @Column(name = "unassigned_by", length = 255)
    private String unassignedBy;

    @PrePersist
    protected void onCreate() {
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }

    public PostalArea getPostalArea() { return postalArea; }
    public void setPostalArea(PostalArea postalArea) { this.postalArea = postalArea; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public String getAssignedBy() { return assignedBy; }
    public void setAssignedBy(String assignedBy) { this.assignedBy = assignedBy; }

    public LocalDateTime getUnassignedAt() { return unassignedAt; }
    public void setUnassignedAt(LocalDateTime unassignedAt) { this.unassignedAt = unassignedAt; }

    public String getUnassignedBy() { return unassignedBy; }
    public void setUnassignedBy(String unassignedBy) { this.unassignedBy = unassignedBy; }
}
