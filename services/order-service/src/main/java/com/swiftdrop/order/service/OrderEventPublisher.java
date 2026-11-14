package com.swiftdrop.order.service;

import com.swiftdrop.order.entity.DeliveryOrder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Publishes domain events to RabbitMQ exchange {@code swiftdrop.events} for Dispatch Service
 * and Notification Service consumption.
 */
@Component
public class OrderEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;

    public OrderEventPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
    }

    public void publishOrderCreated(DeliveryOrder order) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventType", "ORDER_CREATED");
        payload.put("orderId", order.getId());
        payload.put("trackingNumber", order.getTrackingNumber());
        payload.put("status", order.getStatus().name());
        payload.put("pickupMethod", order.getPickupMethod().name());
        payload.put("paymentMethod", order.getPaymentMethod().name());
        payload.put("paymentStatus", order.getPaymentStatus().name());
        payload.put("originBranchId", order.getOriginBranchId());
        payload.put("originBranchCode", order.getOriginBranchCode());
        payload.put("originBranchName", order.getOriginBranchName());
        payload.put("destinationBranchId", order.getDestinationBranchId());
        payload.put("destinationBranchCode", order.getDestinationBranchCode());
        payload.put("destinationBranchName", order.getDestinationBranchName());
        payload.put("sameBranch", order.isSameBranch());
        payload.put("deliveryFee", order.getDeliveryFee());
        payload.put("codAmount", order.getCodAmount());
        payload.put("occurredAt", LocalDateTime.now().toString());

        sendSafely("order.created", payload);
    }

    public void publishOrderStatusChanged(DeliveryOrder order, String previousStatus) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventType", "ORDER_STATUS_CHANGED");
        payload.put("orderId", order.getId());
        payload.put("trackingNumber", order.getTrackingNumber());
        payload.put("previousStatus", previousStatus);
        payload.put("newStatus", order.getStatus().name());
        payload.put("originBranchId", order.getOriginBranchId());
        payload.put("destinationBranchId", order.getDestinationBranchId());
        payload.put("failedAttemptCount", order.getFailedAttemptCount());
        payload.put("occurredAt", LocalDateTime.now().toString());

        sendSafely("order.status.changed", payload);
    }

    private void sendSafely(String routingKey, Map<String, Object> payload) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, payload);
            log.info("Published domain event '{}' for trackingNumber={}",
                    routingKey, payload.get("trackingNumber"));
        } catch (Exception ex) {
            log.warn("RabbitMQ broker unavailable while publishing '{}': {}", routingKey, ex.getMessage());
        }
    }
}

