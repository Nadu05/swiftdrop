package com.swiftdrop.order.entity;

import com.swiftdrop.order.entity.enums.OrderStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * One entry of the official, append-only status history of an order.
 * {@code changedBy} is an Identity user id (null when the system made the change).
 */
@Entity
@Table(name = "order_status_history")
public class OrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, updatable = false)
    private DeliveryOrder order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, updatable = false)
    private OrderStatus status;

    @Column(length = 1000, updatable = false)
    private String note;

    @Column(length = 255, updatable = false)
    private String location;

    @Column(name = "changed_by", updatable = false)
    private Long changedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected OrderStatusHistory() {
        // required by JPA
    }

    public OrderStatusHistory(DeliveryOrder order, OrderStatus status, String note, String location, Long changedBy) {
        this.order = order;
        this.status = status;
        this.note = note;
        this.location = location;
        this.changedBy = changedBy;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public DeliveryOrder getOrder() { return order; }
    public OrderStatus getStatus() { return status; }
    public String getNote() { return note; }
    public String getLocation() { return location; }
    public Long getChangedBy() { return changedBy; }
    public Instant getCreatedAt() { return createdAt; }
}
