package com.swiftdrop.order.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.config.CorrelationIdHolder;
import com.swiftdrop.order.entity.DeliveryAddress;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderOutboxEvent;
import com.swiftdrop.order.repository.OrderOutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Reliable transactional outbox publisher for Order Service domain events on exchange {@code swiftdrop.events}.
 */
@Component
public class OrderEventPublisher {

    public static final String EVENT_ORDER_CREATED = "OrderCreated";
    public static final String EVENT_ORDER_CONFIRMED = "OrderConfirmed";
    public static final String EVENT_ORDER_STATUS_CHANGED = "OrderStatusChanged";

    public static final String ROUTING_KEY_ORDER_CREATED = "order.created";
    public static final String ROUTING_KEY_ORDER_CONFIRMED = "order.confirmed";
    public static final String ROUTING_KEY_ORDER_STATUS_CHANGED = "order.status.changed";

    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;
    private final OrderOutboxEventRepository outboxRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;

    @Value("${swiftdrop.outbox.enabled:true}")
    private boolean outboxSchedulerEnabled = true;

    public OrderEventPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange) {
        this(rabbitTemplate, exchange, null, null, new ObjectMapper());
    }

    @Autowired
    public OrderEventPublisher(
            @Autowired(required = false) RabbitTemplate rabbitTemplate,
            @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange,
            @Autowired(required = false) OrderOutboxEventRepository outboxRepository,
            @Autowired(required = false) ApplicationEventPublisher applicationEventPublisher,
            ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
        this.outboxRepository = outboxRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public record OutboxSavedSignal(String eventId) {
    }

    public void publishOrderCreated(DeliveryOrder order) {
        Map<String, Object> payload = baseOrderPayload(order);
        enqueueOrSend(order, EVENT_ORDER_CREATED, ROUTING_KEY_ORDER_CREATED, payload);
    }

    public void publishOrderConfirmed(DeliveryOrder order) {
        Map<String, Object> payload = baseOrderPayload(order);
        payload.put("confirmedAt", LocalDateTime.now().toString());
        enqueueOrSend(order, EVENT_ORDER_CONFIRMED, ROUTING_KEY_ORDER_CONFIRMED, payload);
    }

    public void publishOrderStatusChanged(DeliveryOrder order, String previousStatus) {
        Map<String, Object> payload = baseOrderPayload(order);
        payload.put("previousStatus", previousStatus);
        payload.put("newStatus", order.getStatus() != null ? order.getStatus().name() : null);
        payload.put("failedAttemptCount", order.getFailedAttemptCount());
        enqueueOrSend(order, EVENT_ORDER_STATUS_CHANGED, ROUTING_KEY_ORDER_STATUS_CHANGED, payload);
    }

    private Map<String, Object> baseOrderPayload(DeliveryOrder order) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("orderId", order.getId());
        payload.put("trackingNumber", order.getTrackingNumber());
        payload.put("status", order.getStatus() != null ? order.getStatus().name() : null);
        payload.put("orderSourceType", order.getOrderSourceType() != null ? order.getOrderSourceType().name() : null);
        payload.put("customerUserId", order.getCustomerUserId());
        payload.put("customerEmail", order.getCustomerEmail());
        payload.put("merchantOrganizationId", order.getMerchantOrganizationId());
        payload.put("pickupMethod", order.getPickupMethod() != null ? order.getPickupMethod().name() : null);
        payload.put("paymentMethod", order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null);
        payload.put("paymentStatus", order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null);
        payload.put("originBranchId", order.getOriginBranchId());
        payload.put("originBranchCode", order.getOriginBranchCode());
        payload.put("originBranchName", order.getOriginBranchName());
        payload.put("destinationBranchId", order.getDestinationBranchId());
        payload.put("destinationBranchCode", order.getDestinationBranchCode());
        payload.put("destinationBranchName", order.getDestinationBranchName());
        payload.put("sameBranch", order.isSameBranch());
        payload.put("distanceKm", order.getDistanceKm());
        payload.put("deliveryFee", order.getDeliveryFee());
        payload.put("codAmount", order.getCodAmount());
        payload.put("currency", order.getCurrency());

        DeliveryAddress pickup = order.getPickupDetails();
        if (pickup != null) {
            payload.put("senderName", pickup.getContactName());
            payload.put("senderPhone", pickup.getContactPhone());
            payload.put("senderEmail", pickup.getContactEmail());
            payload.put("pickupCity", pickup.getCity());
        }
        DeliveryAddress dropoff = order.getDropoffDetails();
        if (dropoff != null) {
            payload.put("recipientName", dropoff.getContactName());
            payload.put("recipientPhone", dropoff.getContactPhone());
            payload.put("recipientEmail", dropoff.getContactEmail());
            payload.put("destinationCity", dropoff.getCity());
        }
        return payload;
    }

    private void enqueueOrSend(
            DeliveryOrder order,
            String eventType,
            String routingKey,
            Map<String, Object> body) {
        String eventId = UUID.randomUUID().toString();
        String correlationId = CorrelationIdHolder.currentOrNew();

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("version", "1.0");
        envelope.put("sourceService", "order-service");
        envelope.put("correlationId", correlationId);
        envelope.put("occurredAt", LocalDateTime.now().toString());
        envelope.put("routingKey", routingKey);
        envelope.putAll(body);

        if (outboxRepository != null) {
            try {
                OrderOutboxEvent row = new OrderOutboxEvent();
                row.setEventId(eventId);
                row.setAggregateType("DeliveryOrder");
                row.setAggregateId(order.getTrackingNumber() != null
                        ? order.getTrackingNumber()
                        : String.valueOf(order.getId()));
                row.setEventType(eventType);
                row.setRoutingKey(routingKey);
                row.setCorrelationId(correlationId);
                row.setPayloadJson(objectMapper.writeValueAsString(envelope));
                row.setStatus(OrderOutboxEvent.STATUS_PENDING);
                outboxRepository.save(row);

                if (applicationEventPublisher != null) {
                    applicationEventPublisher.publishEvent(new OutboxSavedSignal(eventId));
                }
                log.info("[correlationId={}] Enqueued order outbox event type={} eventId={} trackingNumber={}",
                        correlationId, eventType, eventId, order.getTrackingNumber());
                return;
            } catch (Exception ex) {
                throw new IllegalStateException("Failed to enqueue order outbox event " + eventType, ex);
            }
        }

        // Legacy fallback when constructed outside Spring/JPA
        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend(exchange, routingKey, envelope, messagePostProcessor(eventId, eventType, correlationId));
            } catch (Exception ex) {
                log.warn("[correlationId={}] RabbitMQ broker unavailable while publishing '{}': {}",
                        correlationId, routingKey, ex.getMessage());
            }
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onOutboxSavedAfterCommit(OutboxSavedSignal signal) {
        if (outboxRepository == null) {
            return;
        }
        outboxRepository.findByEventId(signal.eventId()).ifPresent(this::attemptPublish);
    }

    @Scheduled(fixedDelayString = "${swiftdrop.outbox.poll-interval-ms:5000}")
    @Transactional
    public void flushPendingOutbox() {
        if (!outboxSchedulerEnabled || outboxRepository == null || rabbitTemplate == null) {
            return;
        }
        List<OrderOutboxEvent> pending = outboxRepository
                .findTop50ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                        OrderOutboxEvent.STATUS_PENDING,
                        LocalDateTime.now()
                );
        for (OrderOutboxEvent event : pending) {
            attemptPublish(event);
        }
    }

    public void attemptPublish(OrderOutboxEvent event) {
        if (!OrderOutboxEvent.STATUS_PENDING.equals(event.getStatus()) || rabbitTemplate == null || outboxRepository == null) {
            return;
        }
        try {
            Map<String, Object> payload = objectMapper.readValue(event.getPayloadJson(), MAP_TYPE);
            rabbitTemplate.convertAndSend(
                    exchange,
                    event.getRoutingKey(),
                    payload,
                    messagePostProcessor(event.getEventId(), event.getEventType(), event.getCorrelationId())
            );
            event.setStatus(OrderOutboxEvent.STATUS_PUBLISHED);
            event.setPublishedAt(LocalDateTime.now());
            event.setLastError(null);
            outboxRepository.save(event);
            log.info("[correlationId={}] Published order outbox event type={} eventId={} trackingNumber={}",
                    event.getCorrelationId(), event.getEventType(), event.getEventId(), event.getAggregateId());
        } catch (Exception ex) {
            int nextRetry = event.getRetryCount() + 1;
            event.setRetryCount(nextRetry);
            event.setLastError(truncate(ex.getMessage(), 950));
            if (nextRetry >= event.getMaxRetries()) {
                event.setStatus(OrderOutboxEvent.STATUS_FAILED);
            } else {
                long backoffSeconds = (long) Math.min(300, 5 * Math.pow(3, Math.max(0, nextRetry - 1)));
                event.setNextAttemptAt(LocalDateTime.now().plusSeconds(backoffSeconds));
            }
            outboxRepository.save(event);
            log.warn("[correlationId={}] Failed publishing order outbox event {} attempt {}/{}: {}",
                    event.getCorrelationId(), event.getEventId(), nextRetry, event.getMaxRetries(), ex.getMessage());
        }
    }

    private MessagePostProcessor messagePostProcessor(String eventId, String eventType, String correlationId) {
        return msg -> {
            msg.getMessageProperties().setMessageId(eventId);
            msg.getMessageProperties().setType(eventType);
            if (correlationId != null) {
                msg.getMessageProperties().setHeader(CorrelationIdHolder.HEADER_NAME, correlationId);
            }
            msg.getMessageProperties().setHeader("eventId", eventId);
            msg.getMessageProperties().setHeader("sourceService", "order-service");
            return msg;
        };
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
