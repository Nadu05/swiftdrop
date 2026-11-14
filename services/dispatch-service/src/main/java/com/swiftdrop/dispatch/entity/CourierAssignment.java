package com.swiftdrop.dispatch.entity;

import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.AssignmentTaskType;
import com.swiftdrop.dispatch.entity.enums.DeliveryPriority;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "courier_assignments")
public class CourierAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_code", nullable = false, unique = true, length = 32)
    private String assignmentCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 20)
    private AssignmentTaskType taskType = AssignmentTaskType.DELIVERY;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_task_id")
    private PickupTask pickupTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_job_id")
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

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "courier_id", nullable = false)
    private CourierProfileEntity courier;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AssignmentStatus status = AssignmentStatus.ASSIGNED;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private DeliveryPriority priority = DeliveryPriority.NORMAL;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "assigned_by_user_id", length = 120)
    private String assignedByUserId;

    @Column(name = "assigned_by_name", length = 150)
    private String assignedByName;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "picked_up_at")
    private LocalDateTime pickedUpAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("recordedAt ASC")
    private List<AssignmentHistoryRecord> history = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.assignedAt == null) {
            this.assignedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addHistoryEntry(AssignmentHistoryRecord record) {
        record.setAssignment(this);
        this.history.add(record);
    }

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

    public AssignmentTaskType getTaskType() {
        return taskType;
    }

    public void setTaskType(AssignmentTaskType taskType) {
        this.taskType = taskType;
    }

    public PickupTask getPickupTask() {
        return pickupTask;
    }

    public void setPickupTask(PickupTask pickupTask) {
        this.pickupTask = pickupTask;
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

    public CourierProfileEntity getCourier() {
        return courier;
    }

    public void setCourier(CourierProfileEntity courier) {
        this.courier = courier;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = status;
    }

    public DeliveryPriority getPriority() {
        return priority;
    }

    public void setPriority(DeliveryPriority priority) {
        this.priority = priority;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getAssignedByUserId() {
        return assignedByUserId;
    }

    public void setAssignedByUserId(String assignedByUserId) {
        this.assignedByUserId = assignedByUserId;
    }

    public String getAssignedByName() {
        return assignedByName;
    }

    public void setAssignedByName(String assignedByName) {
        this.assignedByName = assignedByName;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }

    public LocalDateTime getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(LocalDateTime acceptedAt) {
        this.acceptedAt = acceptedAt;
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

    public List<AssignmentHistoryRecord> getHistory() {
        return history;
    }

    public void setHistory(List<AssignmentHistoryRecord> history) {
        this.history = history;
    }
}
