package com.swiftdrop.order.assistant.service;

import com.swiftdrop.order.assistant.config.AiAssistantProperties;
import com.swiftdrop.order.assistant.exception.AiAssistantException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight, in-memory per-user sliding-window rate limiter keyed by authenticated userId.
 */
@Component
public class AssistantRateLimiter {

    private static final int MAX_TRACKED_USERS = 1000;

    private final AiAssistantProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<String, Deque<Instant>> requestTimestampsByUser = new ConcurrentHashMap<>();

    @Autowired
    public AssistantRateLimiter(AiAssistantProperties properties) {
        this(properties, Clock.systemUTC());
    }

    public AssistantRateLimiter(AiAssistantProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public void checkAndRecord(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("Authenticated user ID is required");
        }

        int maxRequests = Math.max(1, properties.getRateLimitMaxRequests());
        int windowSeconds = Math.max(1, properties.getRateLimitWindowSeconds());

        Instant now = clock.instant();
        Instant windowStart = now.minusSeconds(windowSeconds);

        if (requestTimestampsByUser.size() > MAX_TRACKED_USERS) {
            evictExpiredUsers(windowStart);
        }

        Deque<Instant> timestamps = requestTimestampsByUser.computeIfAbsent(
                userId.trim(),
                ignored -> new ArrayDeque<>()
        );

        synchronized (timestamps) {
            while (!timestamps.isEmpty() && !timestamps.peekFirst().isAfter(windowStart)) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= maxRequests) {
                throw new AiAssistantException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "You have sent too many messages in a short time. Please wait a moment and try again."
                );
            }

            timestamps.addLast(now);
        }
    }

    private void evictExpiredUsers(Instant windowStart) {
        requestTimestampsByUser.entrySet().removeIf(entry -> {
            Deque<Instant> timestamps = entry.getValue();
            synchronized (timestamps) {
                while (!timestamps.isEmpty() && !timestamps.peekFirst().isAfter(windowStart)) {
                    timestamps.pollFirst();
                }
                return timestamps.isEmpty();
            }
        });
    }
}
