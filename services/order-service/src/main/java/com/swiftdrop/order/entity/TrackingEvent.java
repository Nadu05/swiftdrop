package com.swiftdrop.order.entity;

import com.swiftdrop.order.entity.enums.OrderLifecycleStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Immutable milestone tracking event for a delivery order.
 */
@Entity
@Table(name = "tracking_events")
public class TrackingEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, updatable = false)
    private DeliveryOrder order;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, updatable = false, length = 50)
    private OrderLifecycleStatus status;

    @Column(name = "location", updatable = false, length = 255)
    private String location;

    @Column(name = "description", nullable = false, updatable = false, length = 1000)
    private String description;

    @Column(name = "actor_id", updatable = false, length = 100)
    private String actorId;

    @Column(name = "actor_role", updatable = false, length = 50)
    private String actorRole;

    @Column(name = "recorded_at", nullable = false, updatable = false)
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

    public DeliveryOrder getOrder() {
        return order;
    }

    public void setOrder(DeliveryOrder order) {
        this.order = order;
    }

    public OrderLifecycleStatus getStatus() {
        return status;
    }

    public void setStatus(OrderLifecycleStatus status) {
        this.status = status;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getActorId() {
        return actorId;
    }

    public void setActorId(String actorId) {
        this.actorId = actorId;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
}

