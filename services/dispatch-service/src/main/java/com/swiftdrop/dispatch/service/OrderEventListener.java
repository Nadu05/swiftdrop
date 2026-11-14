package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.CreateOperationalTaskRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Listens for domain events published by Order Service on RabbitMQ and creates
 * operational pickup or last-mile delivery tasks for eligible orders.
 */
@Component
public class OrderEventListener {

    private static final Logger log = LoggerFactory.getLogger(OrderEventListener.class);

    private final DispatchService dispatchService;

    public OrderEventListener(DispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    @RabbitListener(queues = "${swiftdrop.rabbitmq.queue:dispatch.events.queue}")
    public void handleDomainEvent(Map<String, Object> event) {
        if (event == null || !event.containsKey("eventType")) {
            return;
        }
        String eventType = String.valueOf(event.get("eventType"));
        String orderId = event.get("orderId") != null ? String.valueOf(event.get("orderId")) : null;
        String trackingNumber = event.get("trackingNumber") != null ? String.valueOf(event.get("trackingNumber")) : null;

        try {
            if ("ORDER_CREATED".equalsIgnoreCase(eventType)) {
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
            } else if ("ORDER_STATUS_CHANGED".equalsIgnoreCase(eventType)) {
                String newStatus = event.get("newStatus") != null ? String.valueOf(event.get("newStatus")) : "";
                if ("AT_DESTINATION_BRANCH".equalsIgnoreCase(newStatus)) {
                    CreateOperationalTaskRequest req = new CreateOperationalTaskRequest();
                    req.setOrderId(orderId);
                    req.setTrackingNumber(trackingNumber);
                    dispatchService.handleParcelAtDestinationBranchEvent(req);
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to process order event {} for trackingNumber={}: {}",
                    eventType, trackingNumber, ex.getMessage());
        }
    }
}
