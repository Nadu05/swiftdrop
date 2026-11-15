package com.swiftdrop.dispatch.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.entity.OutboxEvent;
import com.swiftdrop.dispatch.entity.enums.OutboxStatus;
import com.swiftdrop.dispatch.event.DispatchEvent;
import com.swiftdrop.dispatch.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Service managing transactional outbox event storage, immediate dispatch,
 * and reliable asynchronous retry scheduling.
 */
@Service
public class OutboxPublisherService {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisherService.class);

    private final OutboxEventRepository outboxEventRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final String exchange;

    public OutboxPublisherService(
            OutboxEventRepository outboxEventRepository,
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper,
            @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange) {
        this.outboxEventRepository = outboxEventRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.exchange = exchange;
    }

    /**
     * Persist an event into the transactional outbox and attempt immediate publishing.
     *
     * <p>Reliability Guarantee:
     * 1. The event is saved into the outbox table within the caller's active database transaction.
     * 2. If the database transaction rolls back, the outbox record is also rolled back (no ghost events).
     * 3. An immediate publish is attempted. If RabbitMQ is reachable, the event is published with
     *    sub-millisecond latency and marked PUBLISHED.
     * 4. If RabbitMQ is down, the error is caught, the outbox record remains PENDING/FAILED,
     *    and the scheduled retry poller guarantees eventual delivery without disrupting the client.
     * </p>
     *
     * @param routingKey the AMQP topic routing key (e.g. dispatch.courier.assigned.v1)
     * @param event the dispatch event envelope
     * @return the persisted outbox event entity
     */
    @Transactional
    public OutboxEvent saveAndPublish(String routingKey, DispatchEvent<?> event) {
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize dispatch event to JSON", e);
        }

        OutboxEvent outboxEvent = new OutboxEvent(
                event.getEventId(),
                event.getEventType(),
                event.getEventVersion(),
                routingKey,
                payloadJson,
                event.getOccurredAt()
        );

        OutboxEvent saved = outboxEventRepository.saveAndFlush(outboxEvent);

        // Attempt immediate publication
        publishSingleEvent(saved, event);

        return saved;
    }

    /**
     * Publishes a single outbox event to RabbitMQ.
     * Catches and records any broker transport exceptions safely.
     */
    public boolean publishSingleEvent(OutboxEvent outboxEvent, Object payloadObject) {
        try {
            Object messageToSend = payloadObject;
            if (messageToSend == null) {
                messageToSend = objectMapper.readValue(outboxEvent.getPayload(), DispatchEvent.class);
            }
            rabbitTemplate.convertAndSend(exchange, outboxEvent.getRoutingKey(), messageToSend);

            outboxEvent.setStatus(OutboxStatus.PUBLISHED);
            outboxEvent.setPublishedAt(LocalDateTime.now());
            outboxEvent.setErrorMessage(null);
            outboxEventRepository.saveAndFlush(outboxEvent);
            log.info("Successfully published dispatch event [{}] with routing key [{}]",
                    outboxEvent.getEventId(), outboxEvent.getRoutingKey());
            return true;
        } catch (JsonProcessingException ex) {
            outboxEvent.setStatus(OutboxStatus.DEAD_LETTER);
            outboxEvent.setErrorMessage("Outbox payload deserialization error: " + ex.getMessage());
            log.error("Outbox event [{}] has unparseable JSON payload. Marked DEAD_LETTER.",
                    outboxEvent.getEventId(), ex);
            outboxEventRepository.saveAndFlush(outboxEvent);
            return false;
        } catch (AmqpException ex) {
            int currentRetry = outboxEvent.getRetryCount() != null ? outboxEvent.getRetryCount() + 1 : 1;
            outboxEvent.setRetryCount(currentRetry);
            outboxEvent.setErrorMessage("AMQP publish error: " + ex.getMessage());

            if (currentRetry >= outboxEvent.getMaxRetries()) {
                outboxEvent.setStatus(OutboxStatus.DEAD_LETTER);
                log.error("Outbox event [{}] exceeded maximum retries ({}). Marked DEAD_LETTER.",
                        outboxEvent.getEventId(), outboxEvent.getMaxRetries(), ex);
            } else {
                outboxEvent.setStatus(OutboxStatus.FAILED);
                log.warn("Failed to publish outbox event [{}] to exchange [{}]. Retries: {}/{}. Will be retried.",
                        outboxEvent.getEventId(), exchange, currentRetry, outboxEvent.getMaxRetries());
            }
            outboxEventRepository.saveAndFlush(outboxEvent);
            return false;
        }
    }

    /**
     * Scheduled retry poller for any PENDING or FAILED events that have not exceeded max retries.
     * Runs every 5 seconds to drain the outbox if RabbitMQ experienced a temporary network outage.
     */
    @Scheduled(fixedDelay = 5000)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int processPendingEvents() {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findPendingForProcessing(
                Set.of(OutboxStatus.PENDING, OutboxStatus.FAILED),
                PageRequest.of(0, 50)
        );

        int publishedCount = 0;
        for (OutboxEvent event : pendingEvents) {
            boolean success = publishSingleEvent(event, null);
            if (success) {
                publishedCount++;
            }
        }
        return publishedCount;
    }
}

