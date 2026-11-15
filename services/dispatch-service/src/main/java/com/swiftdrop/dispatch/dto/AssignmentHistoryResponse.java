package com.swiftdrop.dispatch.dto;

import java.time.LocalDateTime;

/**
 * DTO representing an audit trail entry for an assignment creation or reassignment.
 */
public class AssignmentHistoryResponse {

    private Long id;
    private Long assignmentId;
    private Long previousCourierId;
    private String previousCourierCode;
    private String previousCourierName;
    private Long newCourierId;
    private String newCourierCode;
    private String newCourierName;
    private Long changedBy;
    private String changeReason;
    private LocalDateTime changedAt;

    public AssignmentHistoryResponse() {
    }

    public AssignmentHistoryResponse(Long id, Long assignmentId,
                                     Long previousCourierId, String previousCourierCode, String previousCourierName,
                                     Long newCourierId, String newCourierCode, String newCourierName,
                                     Long changedBy, String changeReason, LocalDateTime changedAt) {
        this.id = id;
        this.assignmentId = assignmentId;
        this.previousCourierId = previousCourierId;
        this.previousCourierCode = previousCourierCode;
        this.previousCourierName = previousCourierName;
        this.newCourierId = newCourierId;
        this.newCourierCode = newCourierCode;
        this.newCourierName = newCourierName;
        this.changedBy = changedBy;
        this.changeReason = changeReason;
        this.changedAt = changedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(Long assignmentId) {
        this.assignmentId = assignmentId;
    }

    public Long getPreviousCourierId() {
        return previousCourierId;
    }

    public void setPreviousCourierId(Long previousCourierId) {
        this.previousCourierId = previousCourierId;
    }

    public String getPreviousCourierCode() {
        return previousCourierCode;
    }

    public void setPreviousCourierCode(String previousCourierCode) {
        this.previousCourierCode = previousCourierCode;
    }

    public String getPreviousCourierName() {
        return previousCourierName;
    }

    public void setPreviousCourierName(String previousCourierName) {
        this.previousCourierName = previousCourierName;
    }

    public Long getNewCourierId() {
        return newCourierId;
    }

    public void setNewCourierId(Long newCourierId) {
        this.newCourierId = newCourierId;
    }

    public String getNewCourierCode() {
        return newCourierCode;
    }

    public void setNewCourierCode(String newCourierCode) {
        this.newCourierCode = newCourierCode;
    }

    public String getNewCourierName() {
        return newCourierName;
    }

    public void setNewCourierName(String newCourierName) {
        this.newCourierName = newCourierName;
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

