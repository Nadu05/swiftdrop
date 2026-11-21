package com.swiftdrop.organization.entity;

import com.swiftdrop.organization.entity.enums.MerchantApplicationStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "merchant_application_history")
public class MerchantApplicationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private MerchantApplication application;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 40)
    private MerchantApplicationStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 40)
    private MerchantApplicationStatus newStatus;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "actor_email", nullable = false, length = 255)
    private String actorEmail;

    @Column(name = "actor_user_id", length = 100)
    private String actorUserId;

    @Column(name = "reason", length = 1000)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public MerchantApplicationHistory() {}

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MerchantApplication getApplication() { return application; }
    public void setApplication(MerchantApplication application) { this.application = application; }

    public MerchantApplicationStatus getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(MerchantApplicationStatus previousStatus) { this.previousStatus = previousStatus; }

    public MerchantApplicationStatus getNewStatus() { return newStatus; }
    public void setNewStatus(MerchantApplicationStatus newStatus) { this.newStatus = newStatus; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getActorEmail() { return actorEmail; }
    public void setActorEmail(String actorEmail) { this.actorEmail = actorEmail; }

    public String getActorUserId() { return actorUserId; }
    public void setActorUserId(String actorUserId) { this.actorUserId = actorUserId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

