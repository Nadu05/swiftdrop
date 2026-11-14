package com.swiftdrop.dispatch.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
public class DispatchEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(DispatchEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;

    public DispatchEventPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}") String exchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
    }

    public void publishEvent(String routingKey, String eventType, Map<String, Object> details) {
        Map<String, Object> payload = new HashMap<>(details);
        payload.put("eventType", eventType);
        payload.put("occurredAt", LocalDateTime.now().toString());

        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, payload);
            log.info("Published dispatch event '{}' ({}) for trackingNumber={}",
                    routingKey, eventType, payload.get("trackingNumber"));
        } catch (Exception ex) {
            log.warn("RabbitMQ broker unavailable while publishing '{}': {}", routingKey, ex.getMessage());
        }
    }
}
