package com.swiftdrop.order.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Polls the outbox on a fixed delay. Disable with {@code swiftdrop.outbox.enabled=false}. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(prefix = "swiftdrop.outbox", name = "enabled", havingValue = "true", matchIfMissing = true)
public class OutboxScheduler {

    private static final Logger log = LoggerFactory.getLogger(OutboxScheduler.class);

    private final OutboxPublisher publisher;

    public OutboxScheduler(OutboxPublisher publisher) {
        this.publisher = publisher;
    }

    @Scheduled(fixedDelayString = "${swiftdrop.outbox.poll-interval-ms:2000}")
    public void relay() {
        try {
            publisher.publishPendingBatch();
        } catch (Exception ex) {
            // e.g. database briefly unavailable; the next poll retries.
            log.error("Outbox relay failed", ex);
        }
    }
}
