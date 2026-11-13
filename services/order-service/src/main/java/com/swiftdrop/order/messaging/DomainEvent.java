package com.swiftdrop.order.messaging;

import java.time.Instant;
import java.util.UUID;

/**
 * Standard envelope for every event published by this service (agent.backend.md section 4.4).
 *
 * @param eventId       unique id; consumers de-duplicate on it
 * @param eventType     logical name without version, e.g. {@code order.delivery.created}
 * @param eventVersion  schema version of {@code data}; bump on breaking changes
 * @param occurredAt    when the business fact happened (UTC)
 * @param producer      emitting service
 * @param correlationId request correlation id for tracing across services
 * @param data          the minimum payload consumers need: ids and stable facts, no personal data
 */
public record DomainEvent<T>(
        UUID eventId,
        String eventType,
        int eventVersion,
        Instant occurredAt,
        String producer,
        String correlationId,
        T data
) {
}
