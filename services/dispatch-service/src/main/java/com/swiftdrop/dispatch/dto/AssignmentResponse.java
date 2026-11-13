package com.swiftdrop.dispatch.dto;

import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;

import java.time.LocalDateTime;

public class AssignmentResponse {

    private Long id;
    private String assignmentCode;
    private Long orderId;
    private Long courierId;
    private String courierCode;
    private Long branchId;
    private Long assignedBy;
    private AssignmentStatus status;
    private LocalDateTime assignedAt;

    public AssignmentResponse() {
    }

    public AssignmentResponse(Long id, String assignmentCode, Long orderId, Long courierId,
                              String courierCode, Long branchId, Long assignedBy,
                              AssignmentStatus status, LocalDateTime assignedAt) {
        this.id = id;
        this.assignmentCode = assignmentCode;
        this.orderId = orderId;
        this.courierId = courierId;
        this.courierCode = courierCode;
        this.branchId = branchId;
        this.assignedBy = assignedBy;
        this.status = status;
        this.assignedAt = assignedAt;
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

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
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
}

