package com.swiftdrop.dispatch.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.config.CorrelationIdHolder;
import com.swiftdrop.dispatch.entity.DispatchOutboxEvent;
import com.swiftdrop.dispatch.repository.DispatchOutboxEventRepository;
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
 * Transactional outbox publisher for Dispatch Service events on exchange {@code swiftdrop.events}.
 */
@Component
public class DispatchEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(DispatchEventPublisher.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;
    private final DispatchOutboxEventRepository outboxRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;

    @Value("${swiftdrop.outbox.enabled:true}")
    private boolean outboxSchedulerEnabled = true;

    public DispatchEventPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange) {
        this(rabbitTemplate, exchange, null, null, new ObjectMapper());
    }

    @Autowired
    public DispatchEventPublisher(
            @Autowired(required = false) RabbitTemplate rabbitTemplate,
            @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange,
            @Autowired(required = false) DispatchOutboxEventRepository outboxRepository,
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

    public void publishEvent(String routingKey, String eventType, Map<String, Object> payload) {
        String eventId = UUID.randomUUID().toString();
        String correlationId = CorrelationIdHolder.currentOrNew();

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("version", "1.0");
        envelope.put("sourceService", "dispatch-service");
        envelope.put("correlationId", correlationId);
        envelope.put("occurredAt", LocalDateTime.now().toString());
        envelope.put("routingKey", routingKey);
        if (payload != null) {
            envelope.putAll(payload);
        }

        String aggregateId = resolveAggregateId(envelope);
        String aggregateType = resolveAggregateType(routingKey);

        if (outboxRepository != null) {
            try {
                DispatchOutboxEvent row = new DispatchOutboxEvent();
                row.setEventId(eventId);
                row.setAggregateType(aggregateType);
                row.setAggregateId(aggregateId);
                row.setEventType(eventType);
                row.setRoutingKey(routingKey);
                row.setCorrelationId(correlationId);
                row.setPayloadJson(objectMapper.writeValueAsString(envelope));
                row.setStatus(DispatchOutboxEvent.STATUS_PENDING);
                outboxRepository.save(row);

                if (applicationEventPublisher != null) {
                    applicationEventPublisher.publishEvent(new OutboxSavedSignal(eventId));
                }
                log.info("[correlationId={}] Enqueued dispatch outbox event type={} eventId={} aggregateId={}",
                        correlationId, eventType, eventId, aggregateId);
                return;
            } catch (Exception ex) {
                throw new IllegalStateException("Failed to enqueue dispatch outbox event " + eventType, ex);
            }
        }

        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend(exchange, routingKey, envelope, messagePostProcessor(eventId, eventType, correlationId));
            } catch (Exception ex) {
                log.warn("[correlationId={}] Could not publish dispatch event '{}': {}",
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
        List<DispatchOutboxEvent> pending = outboxRepository
                .findTop50ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                        DispatchOutboxEvent.STATUS_PENDING,
                        LocalDateTime.now()
                );
        for (DispatchOutboxEvent event : pending) {
            attemptPublish(event);
        }
    }

    public void attemptPublish(DispatchOutboxEvent event) {
        if (!DispatchOutboxEvent.STATUS_PENDING.equals(event.getStatus()) || rabbitTemplate == null || outboxRepository == null) {
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
            event.setStatus(DispatchOutboxEvent.STATUS_PUBLISHED);
            event.setPublishedAt(LocalDateTime.now());
            event.setLastError(null);
            outboxRepository.save(event);
            log.info("[correlationId={}] Published dispatch outbox event type={} eventId={} routingKey={}",
                    event.getCorrelationId(), event.getEventType(), event.getEventId(), event.getRoutingKey());
        } catch (Exception ex) {
            int nextRetry = event.getRetryCount() + 1;
            event.setRetryCount(nextRetry);
            event.setLastError(truncate(ex.getMessage(), 950));
            if (nextRetry >= event.getMaxRetries()) {
                event.setStatus(DispatchOutboxEvent.STATUS_FAILED);
            } else {
                long backoffSeconds = (long) Math.min(300, 5 * Math.pow(3, Math.max(0, nextRetry - 1)));
                event.setNextAttemptAt(LocalDateTime.now().plusSeconds(backoffSeconds));
            }
            outboxRepository.save(event);
            log.warn("[correlationId={}] Failed publishing dispatch outbox event {} attempt {}/{}: {}",
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
            msg.getMessageProperties().setHeader("sourceService", "dispatch-service");
            return msg;
        };
    }

    private String resolveAggregateId(Map<String, Object> payload) {
        for (String key : List.of("trackingNumber", "manifestCode", "returnCode", "assignmentCode", "jobCode", "taskCode", "exceptionCode", "orderId")) {
            Object val = payload.get(key);
            if (val != null && !String.valueOf(val).isBlank()) {
                return String.valueOf(val);
            }
        }
        return "dispatch";
    }

    private String resolveAggregateType(String routingKey) {
        if (routingKey == null) return "DispatchAggregate";
        if (routingKey.contains("transfer")) return "TransferManifest";
        if (routingKey.contains("return")) return "ReturnTask";
        if (routingKey.contains("pickup")) return "PickupTask";
        if (routingKey.contains("exception")) return "DeliveryException";
        return "DeliveryJob";
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
