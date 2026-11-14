package com.swiftdrop.order.messaging;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** A domain event waiting to be relayed to the broker (transactional outbox row). */
@Entity
@Table(name = "outbox_events")
public class OutboxEvent {

    private static final int MAX_ERROR_LENGTH = 200;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, updatable = false)
    private UUID eventId;

    @Column(name = "routing_key", nullable = false, length = 100, updatable = false)
    private String routingKey;

    @Column(nullable = false, columnDefinition = "text", updatable = false)
    private String payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "last_error", length = MAX_ERROR_LENGTH)
    private String lastError;

    protected OutboxEvent() {
        // required by JPA
    }

    public OutboxEvent(UUID eventId, String routingKey, String payload) {
        this.eventId = eventId;
        this.routingKey = routingKey;
        this.payload = payload;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.nextAttemptAt = now;
    }

    public void markPublished(Instant now) {
        this.publishedAt = now;
        this.lastError = null;
    }

    /** Records a failed relay attempt and schedules the next one. Only a short error class name is kept. */
    public void markFailed(Instant nextAttemptAt, String error) {
        this.attempts++;
        this.nextAttemptAt = nextAttemptAt;
        this.lastError = error == null ? null : error.substring(0, Math.min(error.length(), MAX_ERROR_LENGTH));
    }

    public Long getId() { return id; }
    public UUID getEventId() { return eventId; }
    public String getRoutingKey() { return routingKey; }
    public String getPayload() { return payload; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public int getAttempts() { return attempts; }
    public Instant getNextAttemptAt() { return nextAttemptAt; }
    public String getLastError() { return lastError; }
}
