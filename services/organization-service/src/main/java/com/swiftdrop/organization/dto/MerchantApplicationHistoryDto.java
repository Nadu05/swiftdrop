package com.swiftdrop.organization.dto;

public class MerchantApplicationHistoryDto {

    private Long id;
    private String previousStatus;
    private String newStatus;
    private String action;
    private String actorEmail;
    private String actorUserId;
    private String reason;
    private String createdAt;

    public MerchantApplicationHistoryDto() {}

    public MerchantApplicationHistoryDto(Long id, String previousStatus, String newStatus,
                                         String action, String actorEmail, String actorUserId,
                                         String reason, String createdAt) {
        this.id = id;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.action = action;
        this.actorEmail = actorEmail;
        this.actorUserId = actorUserId;
        this.reason = reason;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(String previousStatus) { this.previousStatus = previousStatus; }

    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getActorEmail() { return actorEmail; }
    public void setActorEmail(String actorEmail) { this.actorEmail = actorEmail; }

    public String getActorUserId() { return actorUserId; }
    public void setActorUserId(String actorUserId) { this.actorUserId = actorUserId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}

