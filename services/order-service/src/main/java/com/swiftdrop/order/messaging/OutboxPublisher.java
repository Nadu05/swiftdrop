package com.swiftdrop.order.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Relays pending outbox events to RabbitMQ.
 *
 * <p>Each event is published as a persistent JSON message and the broker's publisher confirm is awaited
 * before the row is marked published, so a crash or broker outage can only cause a re-send (at-least-once),
 * never a lost event. On failure the event is retried later with exponential backoff and the batch stops, to
 * keep events in order. Rows are locked with {@code FOR UPDATE SKIP LOCKED}, so multiple instances are safe.
 */
@Component
@EnableConfigurationProperties(OutboxProperties.class)
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    private final OutboxEventRepository outbox;
    private final RabbitTemplate rabbitTemplate;
    private final OutboxProperties properties;
    private final TransactionTemplate transactionTemplate;
    private final String exchange;

    public OutboxPublisher(OutboxEventRepository outbox,
                           RabbitTemplate rabbitTemplate,
                           OutboxProperties properties,
                           PlatformTransactionManager transactionManager,
                           @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange) {
        this.outbox = outbox;
        this.rabbitTemplate = rabbitTemplate;
        this.properties = properties;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.exchange = exchange;
    }

    /** Publishes one batch of due events. Returns how many were published. */
    public int publishPendingBatch() {
        Integer published = transactionTemplate.execute(status -> {
            List<OutboxEvent> batch = outbox.lockNextBatch(properties.batchSize());
            int count = 0;
            for (OutboxEvent event : batch) {
                try {
                    publish(event);
                    event.markPublished(Instant.now());
                    count++;
                } catch (Exception ex) {
                    if (ex instanceof InterruptedException) {
                        Thread.currentThread().interrupt();
                    }
                    event.markFailed(nextAttemptAfter(event.getAttempts() + 1), ex.getClass().getSimpleName());
                    log.warn("Could not publish event {} (attempt {}): {}",
                            event.getEventId(), event.getAttempts(), ex.getClass().getSimpleName());
                    break; // keep ordering: do not publish later events before this one
                }
            }
            return count;
        });
        return published == null ? 0 : published;
    }

    private void publish(OutboxEvent event) throws Exception {
        Message message = MessageBuilder
                .withBody(event.getPayload().getBytes(StandardCharsets.UTF_8))
                .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                .setContentEncoding(StandardCharsets.UTF_8.name())
                .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                .setMessageId(event.getEventId().toString())
                .build();
        CorrelationData correlation = new CorrelationData(event.getEventId().toString());

        rabbitTemplate.send(exchange, event.getRoutingKey(), message, correlation);

        CorrelationData.Confirm confirm = correlation.getFuture().get(properties.confirmTimeoutMs(), TimeUnit.MILLISECONDS);
        if (!confirm.isAck()) {
            throw new IllegalStateException("Broker did not acknowledge the event");
        }
        if (correlation.getReturned() != null) {
            // Accepted by the broker but no queue is bound for this key yet (publish/subscribe: nobody listening).
            log.warn("Event {} ({}) was not routed to any queue", event.getEventId(), event.getRoutingKey());
        }
    }

    private Instant nextAttemptAfter(int attempts) {
        long delaySeconds = Math.min(1L << Math.min(attempts, 20), properties.maxBackoffSeconds());
        return Instant.now().plusSeconds(delaySeconds);
    }
}
