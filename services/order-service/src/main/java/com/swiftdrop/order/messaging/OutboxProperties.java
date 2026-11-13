package com.swiftdrop.order.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Outbox relay settings, bound from {@code swiftdrop.outbox.*}.
 *
 * @param enabled           run the background relay (tests switch it off and call the publisher directly)
 * @param batchSize         events relayed per poll
 * @param pollIntervalMs    delay between polls
 * @param confirmTimeoutMs  how long to wait for the broker's publisher confirm per event
 * @param maxBackoffSeconds ceiling of the exponential retry delay for a failing event
 */
@ConfigurationProperties(prefix = "swiftdrop.outbox")
public record OutboxProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("20") int batchSize,
        @DefaultValue("2000") long pollIntervalMs,
        @DefaultValue("5000") long confirmTimeoutMs,
        @DefaultValue("300") long maxBackoffSeconds
) {
}
