package com.swiftdrop.notification.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "processed_domain_events",
        uniqueConstraints = @UniqueConstraint(name = "uq_notification_processed_event", columnNames = {"event_id", "consumer_group"})
)
public class NotificationProcessedEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, length = 100)
    private String eventId;

    @Column(name = "consumer_group", nullable = false, length = 80)
    private String consumerGroup;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "correlation_id", length = 80)
    private String correlationId;

    @Column(name = "processed_at", nullable = false)
    private LocalDateTime processedAt;

    public NotificationProcessedEvent() {
    }

    public NotificationProcessedEvent(String eventId, String consumerGroup, String eventType, String correlationId) {
        this.eventId = eventId;
        this.consumerGroup = consumerGroup;
        this.eventType = eventType;
        this.correlationId = correlationId;
        this.processedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.processedAt == null) {
            this.processedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public String getEventId() { return eventId; }
    public String getConsumerGroup() { return consumerGroup; }
    public String getEventType() { return eventType; }
    public String getCorrelationId() { return correlationId; }
    public LocalDateTime getProcessedAt() { return processedAt; }
}

