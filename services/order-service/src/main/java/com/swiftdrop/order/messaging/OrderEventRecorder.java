package com.swiftdrop.order.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderStatus;
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
    public static final String ORDER_STATUS_CHANGED_ROUTING_KEY = "order.delivery.status-changed.v1";
    static final String ORDER_CREATED_TYPE = "order.delivery.created";
    static final String ORDER_STATUS_CHANGED_TYPE = "order.delivery.status-changed";
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
        record(ORDER_CREATED_TYPE, ORDER_CREATED_ROUTING_KEY, data);
    }

    /** Call after the order's status was changed, in the same transaction as that change. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordStatusChanged(DeliveryOrder order, OrderStatus previousStatus, Instant changedAt) {
        OrderStatusChangedData data = new OrderStatusChangedData(
                order.getId(), order.getTrackingNumber(), order.getCustomerId(), order.getBranchId(),
                previousStatus, order.getStatus(), changedAt);
        record(ORDER_STATUS_CHANGED_TYPE, ORDER_STATUS_CHANGED_ROUTING_KEY, data);
    }

    private <T> void record(String eventType, String routingKey, T data) {
        DomainEvent<T> event = new DomainEvent<>(
                UUID.randomUUID(), eventType, 1, Instant.now(), PRODUCER, currentCorrelationId(), data);
        try {
            outbox.save(new OutboxEvent(event.eventId(), routingKey, objectMapper.writeValueAsString(event)));
        } catch (JsonProcessingException ex) {
            // Fail the whole transaction rather than commit a change whose event can never be sent.
            throw new IllegalStateException("Could not serialize " + eventType + " event", ex);
        }
    }

    private static String currentCorrelationId() {
        String id = MDC.get(CorrelationIdFilter.MDC_KEY);
        return id != null ? id : UUID.randomUUID().toString();
    }
}
