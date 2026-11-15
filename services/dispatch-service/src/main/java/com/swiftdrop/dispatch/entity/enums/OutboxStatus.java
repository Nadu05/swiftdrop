package com.swiftdrop.dispatch.entity.enums;

/**
 * Processing status for transactional outbox events awaiting RabbitMQ publication.
 */
public enum OutboxStatus {
    PENDING,
    PROCESSING,
    PUBLISHED,
    FAILED,
    DEAD_LETTER
}

