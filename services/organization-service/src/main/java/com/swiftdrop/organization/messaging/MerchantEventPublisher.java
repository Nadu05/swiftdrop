package com.swiftdrop.organization.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Publishes merchant lifecycle events to RabbitMQ <strong>only after</strong> the database
 * transaction that changed the merchant status has committed.
 *
 * <p>{@code MerchantService} raises a {@link MerchantLifecycleEvent} as a Spring application event
 * inside its transaction. This listener runs in the {@code AFTER_COMMIT} phase, so a rolled-back
 * transaction never produces a message.</p>
 *
 * <p><strong>Delivery guarantee: at-most-once.</strong> There is no transactional outbox yet. If the
 * broker is unreachable after commit, the failure is logged and the event is lost (the status change
 * itself remains committed). A transactional outbox is required for guaranteed delivery and is a
 * documented future enhancement.</p>
 */
@Component
public class MerchantEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(MerchantEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;

    public MerchantEventPublisher(RabbitTemplate rabbitTemplate,
                                  @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMerchantLifecycleEvent(MerchantLifecycleEvent event) {
        try {
            rabbitTemplate.convertAndSend(exchange, event.routingKey(), event);
            log.info("Published {} eventId={} merchantId={} to exchange={}",
                    event.routingKey(), event.eventId(), event.merchantId(), exchange);
        } catch (AmqpException ex) {
            // The DB change is already committed; do not fail the HTTP request. Event is lost (no outbox).
            log.error("Failed to publish {} eventId={} merchantId={} to exchange={}: {}",
                    event.routingKey(), event.eventId(), event.merchantId(), exchange, ex.getMessage(), ex);
        }
    }

    String getExchange() {
        return exchange;
    }
}

