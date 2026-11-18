package com.swiftdrop.dispatch.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Stores the response of a courier action so a retried request with the same key replays it safely. */
@Entity
@Table(name = "courier_idempotency_keys",
        uniqueConstraints = @UniqueConstraint(name = "uq_courier_idempotency", columnNames = {"actor_id", "idempotency_key"}))
public class CourierIdempotencyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "actor_id", nullable = false, length = 100)
    private String actorId;

    @Column(name = "operation", nullable = false, length = 40)
    private String operation;

    @Column(name = "assignment_ref", nullable = false, length = 100)
    private String assignmentRef;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Column(name = "response_json", nullable = false, columnDefinition = "TEXT")
    private String responseJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public CourierIdempotencyRecord() {
    }

    public CourierIdempotencyRecord(String idempotencyKey, String actorId, String operation,
                                    String assignmentRef, String requestHash, String responseJson) {
        this.idempotencyKey = idempotencyKey;
        this.actorId = actorId;
        this.operation = operation;
        this.assignmentRef = assignmentRef;
        this.requestHash = requestHash;
        this.responseJson = responseJson;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getActorId() { return actorId; }
    public String getOperation() { return operation; }
    public String getAssignmentRef() { return assignmentRef; }
    public String getRequestHash() { return requestHash; }
    public String getResponseJson() { return responseJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
