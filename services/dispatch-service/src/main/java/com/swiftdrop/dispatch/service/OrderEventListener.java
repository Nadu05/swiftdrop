package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.config.CorrelationIdHolder;
import com.swiftdrop.dispatch.dto.CreateOperationalTaskRequest;
import com.swiftdrop.dispatch.entity.DispatchProcessedEvent;
import com.swiftdrop.dispatch.repository.DispatchProcessedEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

/**
 * Listens for domain events published by Order Service on RabbitMQ and idempotently creates
 * operational pickup or last-mile delivery tasks for confirmed orders.
 */
@Component
public class OrderEventListener {

    public static final String CONSUMER_GROUP = "dispatch-order-consumer";
    private static final Logger log = LoggerFactory.getLogger(OrderEventListener.class);

    private final DispatchService dispatchService;
    private final DispatchProcessedEventRepository processedEventRepository;

    public OrderEventListener(DispatchService dispatchService) {
        this(dispatchService, null);
    }

    @Autowired
    public OrderEventListener(
            DispatchService dispatchService,
            @Autowired(required = false) DispatchProcessedEventRepository processedEventRepository) {
        this.dispatchService = dispatchService;
        this.processedEventRepository = processedEventRepository;
    }

    @RabbitListener(queues = "${swiftdrop.rabbitmq.queue:dispatch.events.queue}")
    @Transactional
    public void handleDomainEvent(Map<String, Object> event) {
        if (event == null || !event.containsKey("eventType")) {
            return;
        }

        String rawEventType = String.valueOf(event.get("eventType"));
        String normalizedType = rawEventType.replace("_", "").trim().toLowerCase();
        String correlationId = event.get("correlationId") != null
                ? String.valueOf(event.get("correlationId"))
                : CorrelationIdHolder.currentOrNew();
        String eventId = resolveEventId(event, rawEventType);

        MDC.put(CorrelationIdHolder.MDC_KEY, correlationId);
        try {
            if (processedEventRepository != null
                    && processedEventRepository.existsByEventIdAndConsumerGroup(eventId, CONSUMER_GROUP)) {
                log.info("[correlationId={}] Skipping duplicate domain event type={} eventId={}",
                        correlationId, rawEventType, eventId);
                return;
            }

            String orderId = event.get("orderId") != null ? String.valueOf(event.get("orderId")) : null;
            String trackingNumber = event.get("trackingNumber") != null ? String.valueOf(event.get("trackingNumber")) : null;

            switch (normalizedType) {
                case "ordercreated" -> {
                    String pickupMethod = event.get("pickupMethod") != null
                            ? String.valueOf(event.get("pickupMethod"))
                            : "COURIER_PICKUP";
                    String paymentStatus = event.get("paymentStatus") != null
                            ? String.valueOf(event.get("paymentStatus"))
                            : "";
                    if ("COURIER_PICKUP".equalsIgnoreCase(pickupMethod)
                            && !"PENDING_PAYMENT".equalsIgnoreCase(paymentStatus)) {
                        CreateOperationalTaskRequest req = new CreateOperationalTaskRequest();
                        req.setOrderId(orderId);
                        req.setTrackingNumber(trackingNumber);
                        req.setPickupMethod(pickupMethod);
                        dispatchService.handleOrderCreatedEvent(req);
                    }
                }
                case "orderconfirmed" -> {
                    String pickupMethod = event.get("pickupMethod") != null
                            ? String.valueOf(event.get("pickupMethod"))
                            : "COURIER_PICKUP";
                    if ("COURIER_PICKUP".equalsIgnoreCase(pickupMethod)) {
                        CreateOperationalTaskRequest req = new CreateOperationalTaskRequest();
                        req.setOrderId(orderId);
                        req.setTrackingNumber(trackingNumber);
                        req.setPickupMethod(pickupMethod);
                        dispatchService.handleOrderCreatedEvent(req);
                    }
                }
                case "orderstatuschanged" -> {
                    String newStatus = event.get("newStatus") != null ? String.valueOf(event.get("newStatus")) : "";
                    if ("AT_DESTINATION_BRANCH".equalsIgnoreCase(newStatus)) {
                        CreateOperationalTaskRequest req = new CreateOperationalTaskRequest();
                        req.setOrderId(orderId);
                        req.setTrackingNumber(trackingNumber);
                        dispatchService.handleParcelAtDestinationBranchEvent(req);
                    }
                }
                default -> {
                    // Other dispatch.* / unrelated topics ignored gracefully
                }
            }

            if (processedEventRepository != null) {
                processedEventRepository.save(new DispatchProcessedEvent(
                        eventId,
                        CONSUMER_GROUP,
                        rawEventType,
                        correlationId
                ));
            }
        } catch (RuntimeException ex) {
            log.error("[correlationId={}] Error processing domain event type={} eventId={}: {}",
                    correlationId, rawEventType, eventId, ex.getMessage());
            throw ex;
        } finally {
            MDC.remove(CorrelationIdHolder.MDC_KEY);
        }
    }

    private String resolveEventId(Map<String, Object> event, String eventType) {
        Object rawId = event.get("eventId");
        if (rawId != null && !String.valueOf(rawId).isBlank()) {
            return String.valueOf(rawId).trim();
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String fingerprint = eventType + "|" + event.get("orderId") + "|" + event.get("trackingNumber")
                    + "|" + event.get("newStatus") + "|" + event.get("occurredAt");
            byte[] hash = digest.digest(fingerprint.getBytes(StandardCharsets.UTF_8));
            return "legacy-" + HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (Exception ex) {
            return "legacy-" + Math.abs((eventType + event.get("orderId")).hashCode());
        }
    }
}
