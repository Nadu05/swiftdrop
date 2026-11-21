package com.swiftdrop.notification.service;

import com.swiftdrop.notification.config.CorrelationIdHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class DomainEventNotificationListener {

    private static final Logger log = LoggerFactory.getLogger(DomainEventNotificationListener.class);
    private final NotificationService notificationService;

    public DomainEventNotificationListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @RabbitListener(queues = "${swiftdrop.rabbitmq.queue:notification.events.queue}")
    public void onDomainEvent(Map<String, Object> event) {
        if (event == null || !event.containsKey("eventType")) {
            return;
        }
        Object rawCorr = event.get("correlationId");
        String correlationId = rawCorr != null && !String.valueOf(rawCorr).isBlank()
                ? String.valueOf(rawCorr)
                : CorrelationIdHolder.currentOrNew();
        MDC.put(CorrelationIdHolder.MDC_KEY, correlationId);
        try {
            log.debug("[corr={}] Notification consumer received eventType={}", correlationId, event.get("eventType"));
            notificationService.processDomainEvent(event);
        } finally {
            MDC.remove(CorrelationIdHolder.MDC_KEY);
        }
    }
}

