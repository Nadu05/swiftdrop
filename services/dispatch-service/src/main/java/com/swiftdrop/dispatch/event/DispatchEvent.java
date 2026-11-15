package com.swiftdrop.dispatch.event;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

/**
 * Standard event envelope for all domain events published by Dispatch Service.
 *
 * @param <T> the type of data payload
 */
public class DispatchEvent<T> {

    private String eventId;
    private String eventType;
    private Integer eventVersion;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime occurredAt;

    private String producer;
    private String correlationId;
    private T data;

    public DispatchEvent() {
        this.eventVersion = 1;
        this.producer = "dispatch-service";
        this.occurredAt = LocalDateTime.now();
    }

    public DispatchEvent(String eventId, String eventType, Integer eventVersion,
                         LocalDateTime occurredAt, String producer, String correlationId, T data) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.eventVersion = eventVersion != null ? eventVersion : 1;
        this.occurredAt = occurredAt != null ? occurredAt : LocalDateTime.now();
        this.producer = producer != null ? producer : "dispatch-service";
        this.correlationId = correlationId;
        this.data = data;
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Integer getEventVersion() {
        return eventVersion;
    }

    public void setEventVersion(Integer eventVersion) {
        this.eventVersion = eventVersion;
    }

    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(LocalDateTime occurredAt) {
        this.occurredAt = occurredAt;
    }

    public String getProducer() {
        return producer;
    }

    public void setProducer(String producer) {
        this.producer = producer;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}

