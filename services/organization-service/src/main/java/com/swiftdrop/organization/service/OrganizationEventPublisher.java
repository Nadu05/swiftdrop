package com.swiftdrop.organization.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.config.CorrelationIdHolder;
import com.swiftdrop.organization.entity.MerchantApplication;
import com.swiftdrop.organization.entity.OrganizationOutboxEvent;
import com.swiftdrop.organization.repository.OrganizationOutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrganizationEventPublisher {

    public static final String EVENT_MERCHANT_APPLICATION_SUBMITTED = "MerchantApplicationSubmitted";
    public static final String EVENT_MERCHANT_APPLICATION_APPROVED = "MerchantApplicationApproved";
    public static final String EVENT_MERCHANT_APPLICATION_REJECTED = "MerchantApplicationRejected";

    public static final String ROUTING_KEY_MERCHANT_SUBMITTED = "organization.merchant.submitted";
    public static final String ROUTING_KEY_MERCHANT_APPROVED = "organization.merchant.approved";
    public static final String ROUTING_KEY_MERCHANT_REJECTED = "organization.merchant.rejected";

    private static final Logger log = LoggerFactory.getLogger(OrganizationEventPublisher.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final OrganizationOutboxEventRepository outboxRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${swiftdrop.rabbitmq.domain-exchange:swiftdrop.events}")
    private String domainExchange = "swiftdrop.events";

    @Value("${swiftdrop.outbox.enabled:true}")
    private boolean outboxSchedulerEnabled = true;

    public OrganizationEventPublisher(
            OrganizationOutboxEventRepository outboxRepository,
            ApplicationEventPublisher applicationEventPublisher,
            @Autowired(required = false) RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper) {
        this.outboxRepository = outboxRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    public record OutboxSavedSignal(String eventId) {
    }

    public void publishMerchantApplicationSubmitted(MerchantApplication application) {
        Map<String, Object> payload = baseMerchantPayload(application);
        saveOutboxEvent(
                "MerchantApplication",
                application.getApplicationCode(),
                EVENT_MERCHANT_APPLICATION_SUBMITTED,
                ROUTING_KEY_MERCHANT_SUBMITTED,
                payload
        );
    }

    public void publishMerchantApplicationApproved(MerchantApplication application, String approvedByEmail) {
        Map<String, Object> payload = baseMerchantPayload(application);
        payload.put("approvedByEmail", approvedByEmail);
        payload.put("reviewNotes", application.getReviewNotes());
        payload.put("reviewedAt", application.getReviewedAt() != null ? application.getReviewedAt().toString() : null);
        saveOutboxEvent(
                "MerchantApplication",
                application.getApplicationCode(),
                EVENT_MERCHANT_APPLICATION_APPROVED,
                ROUTING_KEY_MERCHANT_APPROVED,
                payload
        );
    }

    public void publishMerchantApplicationRejected(MerchantApplication application, String rejectedByEmail, String reason) {
        Map<String, Object> payload = baseMerchantPayload(application);
        payload.put("rejectedByEmail", rejectedByEmail);
        payload.put("rejectionReason", reason);
        payload.put("reviewedAt", application.getReviewedAt() != null ? application.getReviewedAt().toString() : null);
        saveOutboxEvent(
                "MerchantApplication",
                application.getApplicationCode(),
                EVENT_MERCHANT_APPLICATION_REJECTED,
                ROUTING_KEY_MERCHANT_REJECTED,
                payload
        );
    }

    private Map<String, Object> baseMerchantPayload(MerchantApplication application) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("applicationId", application.getId());
        payload.put("applicationCode", application.getApplicationCode());
        payload.put("applicantUserId", application.getApplicantUserId());
        payload.put("applicantEmail", application.getApplicantEmail());
        payload.put("businessName", application.getBusinessName());
        payload.put("businessRegistrationNumber", application.getBusinessRegistrationNumber());
        payload.put("contactFullName", application.getContactFullName());
        payload.put("contactEmail", application.getContactEmail());
        payload.put("contactPhone", application.getContactPhone());
        payload.put("city", application.getCity());
        payload.put("nearestBranch", application.getNearestBranch());
        payload.put("status", application.getStatus() != null ? application.getStatus().name() : null);
        return payload;
    }

    protected void saveOutboxEvent(
            String aggregateType,
            String aggregateId,
            String eventType,
            String routingKey,
            Map<String, Object> body) {
        String eventId = UUID.randomUUID().toString();
        String correlationId = CorrelationIdHolder.currentOrNew();

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("version", "1.0");
        envelope.put("sourceService", "organization-service");
        envelope.put("correlationId", correlationId);
        envelope.put("occurredAt", LocalDateTime.now().toString());
        envelope.put("routingKey", routingKey);
        if (body != null) {
            envelope.putAll(body);
        }

        try {
            OrganizationOutboxEvent row = new OrganizationOutboxEvent();
            row.setEventId(eventId);
            row.setAggregateType(aggregateType);
            row.setAggregateId(aggregateId);
            row.setEventType(eventType);
            row.setRoutingKey(routingKey);
            row.setCorrelationId(correlationId);
            row.setPayloadJson(objectMapper.writeValueAsString(envelope));
            row.setStatus(OrganizationOutboxEvent.STATUS_PENDING);
            outboxRepository.save(row);

            if (applicationEventPublisher != null) {
                applicationEventPublisher.publishEvent(new OutboxSavedSignal(eventId));
            }
            log.info("[correlationId={}] Enqueued outbox event type={} eventId={} aggregateId={}",
                    correlationId, eventType, eventId, aggregateId);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to enqueue outbox event " + eventType, ex);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onOutboxSavedAfterCommit(OutboxSavedSignal signal) {
        outboxRepository.findByEventId(signal.eventId()).ifPresent(this::attemptPublish);
    }

    @Scheduled(fixedDelayString = "${swiftdrop.outbox.poll-interval-ms:5000}")
    @Transactional
    public void flushPendingOutbox() {
        if (!outboxSchedulerEnabled || rabbitTemplate == null) {
            return;
        }
        List<OrganizationOutboxEvent> pending = outboxRepository
                .findTop50ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                        OrganizationOutboxEvent.STATUS_PENDING,
                        LocalDateTime.now()
                );
        for (OrganizationOutboxEvent event : pending) {
            attemptPublish(event);
        }
    }

    public void attemptPublish(OrganizationOutboxEvent event) {
        if (!OrganizationOutboxEvent.STATUS_PENDING.equals(event.getStatus()) || rabbitTemplate == null) {
            return;
        }
        try {
            Map<String, Object> payload = objectMapper.readValue(event.getPayloadJson(), MAP_TYPE);
            MessagePostProcessor postProcessor = msg -> {
                msg.getMessageProperties().setMessageId(event.getEventId());
                msg.getMessageProperties().setType(event.getEventType());
                if (event.getCorrelationId() != null) {
                    msg.getMessageProperties().setHeader(CorrelationIdHolder.HEADER_NAME, event.getCorrelationId());
                }
                msg.getMessageProperties().setHeader("eventId", event.getEventId());
                msg.getMessageProperties().setHeader("sourceService", "organization-service");
                return msg;
            };
            rabbitTemplate.convertAndSend(domainExchange, event.getRoutingKey(), payload, postProcessor);
            event.setStatus(OrganizationOutboxEvent.STATUS_PUBLISHED);
            event.setPublishedAt(LocalDateTime.now());
            event.setLastError(null);
            outboxRepository.save(event);
            log.info("[correlationId={}] Published outbox event {} ({}) -> {}",
                    event.getCorrelationId(), event.getEventType(), event.getEventId(), event.getRoutingKey());
        } catch (Exception ex) {
            int nextRetry = event.getRetryCount() + 1;
            event.setRetryCount(nextRetry);
            event.setLastError(truncate(ex.getMessage(), 950));
            if (nextRetry >= event.getMaxRetries()) {
                event.setStatus(OrganizationOutboxEvent.STATUS_FAILED);
            } else {
                long backoffSeconds = (long) Math.min(300, 5 * Math.pow(3, Math.max(0, nextRetry - 1)));
                event.setNextAttemptAt(LocalDateTime.now().plusSeconds(backoffSeconds));
            }
            outboxRepository.save(event);
            log.warn("[correlationId={}] Failed publishing outbox event {} attempt {}/{}: {}",
                    event.getCorrelationId(), event.getEventId(), nextRetry, event.getMaxRetries(), ex.getMessage());
        }
    }

    private String truncate(String msg, int max) {
        if (msg == null) return null;
        return msg.length() <= max ? msg : msg.substring(0, max);
    }
}

