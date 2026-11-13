package com.swiftdrop.organization.messaging;

import com.swiftdrop.organization.entity.enums.MerchantStatus;

/**
 * Merchant lifecycle event types published to the shared {@code swiftdrop.events} topic exchange.
 *
 * <p>Routing keys follow the project convention {@code <domain>.<entity>.<event>.v<version>}
 * from {@code agents/agent.backend.md} (section 4.2).</p>
 */
public enum MerchantEventType {

    APPROVED("organization.merchant.approved"),
    REJECTED("organization.merchant.rejected"),
    SUSPENDED("organization.merchant.suspended"),
    REACTIVATED("organization.merchant.reactivated");

    public static final int VERSION = 1;

    private final String eventType;

    MerchantEventType(String eventType) {
        this.eventType = eventType;
    }

    /** Event type without version suffix, e.g. {@code organization.merchant.approved}. */
    public String eventType() {
        return eventType;
    }

    /** RabbitMQ routing key, e.g. {@code organization.merchant.approved.v1}. */
    public String routingKey() {
        return eventType + ".v" + VERSION;
    }

    /**
     * Maps a completed status transition to its event type.
     * SUSPENDED &rarr; APPROVED is a reactivation, not a first approval.
     */
    public static MerchantEventType forTransition(MerchantStatus from, MerchantStatus to) {
        return switch (to) {
            case APPROVED -> from == MerchantStatus.SUSPENDED ? REACTIVATED : APPROVED;
            case REJECTED -> REJECTED;
            case SUSPENDED -> SUSPENDED;
            case PENDING -> throw new IllegalArgumentException("No lifecycle event for transition to PENDING");
        };
    }
}

