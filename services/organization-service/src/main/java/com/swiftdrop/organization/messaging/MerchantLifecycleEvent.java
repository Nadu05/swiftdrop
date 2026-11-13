package com.swiftdrop.organization.messaging;

/**
 * Versioned merchant lifecycle event payload (JSON) published to RabbitMQ.
 *
 * <p>Contains only what downstream consumers (e.g. Notification) need. Contact details,
 * addresses, and the business registration number are deliberately excluded.</p>
 *
 * @param eventId        unique event ID (UUID) so consumers can de-duplicate redeliveries
 * @param eventType      e.g. {@code organization.merchant.approved}
 * @param eventVersion   payload schema version (currently 1)
 * @param occurredAt     ISO-8601 UTC timestamp of the committed status change
 * @param producer       always {@code organization-service}
 * @param merchantId     Organization Service merchant profile ID
 * @param identityUserId external Identity Service user reference (unverified; may be null)
 * @param businessName   merchant business name
 * @param status         new merchant status
 * @param previousStatus status before the transition
 * @param reason         rejection/suspension reason; null for approval/reactivation
 */
public record MerchantLifecycleEvent(
        String eventId,
        String eventType,
        int eventVersion,
        String occurredAt,
        String producer,
        Long merchantId,
        String identityUserId,
        String businessName,
        String status,
        String previousStatus,
        String reason
) {
    public static final String PRODUCER = "organization-service";

    /** Routing key derived from {@link #eventType} and {@link #eventVersion}. */
    public String routingKey() {
        return eventType + ".v" + eventVersion;
    }
}

