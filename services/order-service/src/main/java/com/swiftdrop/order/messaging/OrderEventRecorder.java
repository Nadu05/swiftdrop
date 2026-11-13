package com.swiftdrop.order.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.web.CorrelationIdFilter;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Records domain events in the outbox. It joins the caller's transaction (it fails if there is none),
 * so an event row exists if and only if the business change committed. Actual publishing to RabbitMQ is
 * done later by {@link OutboxPublisher}.
 */
@Component
public class OrderEventRecorder {

    public static final String ORDER_CREATED_ROUTING_KEY = "order.delivery.created.v1";
    static final String ORDER_CREATED_TYPE = "order.delivery.created";
    static final String PRODUCER = "order-service";

    private final OutboxEventRepository outbox;
    private final ObjectMapper objectMapper;

    public OrderEventRecorder(OutboxEventRepository outbox, ObjectMapper objectMapper) {
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordOrderCreated(DeliveryOrder order) {
        OrderCreatedData data = new OrderCreatedData(
                order.getId(), order.getTrackingNumber(), order.getCustomerId(), order.getBranchId(), order.getStatus());
        DomainEvent<OrderCreatedData> event = new DomainEvent<>(
                UUID.randomUUID(), ORDER_CREATED_TYPE, 1, Instant.now(), PRODUCER, currentCorrelationId(), data);
        try {
            outbox.save(new OutboxEvent(event.eventId(), ORDER_CREATED_ROUTING_KEY, objectMapper.writeValueAsString(event)));
        } catch (JsonProcessingException ex) {
            // Fail the whole transaction rather than commit an order whose event can never be sent.
            throw new IllegalStateException("Could not serialize " + ORDER_CREATED_TYPE + " event", ex);
        }
    }

    private static String currentCorrelationId() {
        String id = MDC.get(CorrelationIdFilter.MDC_KEY);
        return id != null ? id : UUID.randomUUID().toString();
    }
}
