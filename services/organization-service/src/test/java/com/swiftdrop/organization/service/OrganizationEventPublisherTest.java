package com.swiftdrop.organization.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.config.CorrelationIdHolder;
import com.swiftdrop.organization.entity.MerchantApplication;
import com.swiftdrop.organization.entity.OrganizationOutboxEvent;
import com.swiftdrop.organization.entity.enums.MerchantApplicationStatus;
import com.swiftdrop.organization.repository.OrganizationOutboxEventRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizationEventPublisherTest {

    @Mock
    private OrganizationOutboxEventRepository outboxRepository;

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @Mock
    private RabbitTemplate rabbitTemplate;

    private OrganizationEventPublisher publisher;
    private MerchantApplication sampleApp;

    @BeforeEach
    void setUp() {
        publisher = new OrganizationEventPublisher(
                outboxRepository,
                applicationEventPublisher,
                rabbitTemplate,
                new ObjectMapper()
        );
        sampleApp = new MerchantApplication();
        sampleApp.setId(42L);
        sampleApp.setApplicationCode("APP-2026-0820");
        sampleApp.setApplicantUserId("usr-merch-42");
        sampleApp.setApplicantEmail("merchant@swiftdrop.lk");
        sampleApp.setBusinessName("Ceylon Roast Co");
        sampleApp.setBusinessRegistrationNumber("PV-123456");
        sampleApp.setContactFullName("Nadeesha Silva");
        sampleApp.setContactEmail("nadeesha@ceylonroast.lk");
        sampleApp.setContactPhone("+94 77 111 2233");
        sampleApp.setCity("Colombo");
        sampleApp.setNearestBranch("Colombo Central");
        sampleApp.setStatus(MerchantApplicationStatus.PENDING);
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void publishMerchantApplicationSubmitted_WritesOutboxBeforeCommitAndSignalsAfterCommit() {
        MDC.put(CorrelationIdHolder.MDC_KEY, "corr-org-001");
        when(outboxRepository.save(any(OrganizationOutboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        publisher.publishMerchantApplicationSubmitted(sampleApp);

        ArgumentCaptor<OrganizationOutboxEvent> captor = ArgumentCaptor.forClass(OrganizationOutboxEvent.class);
        verify(outboxRepository).save(captor.capture());
        OrganizationOutboxEvent row = captor.getValue();
        assertThat(row.getEventType()).isEqualTo("MerchantApplicationSubmitted");
        assertThat(row.getRoutingKey()).isEqualTo("organization.merchant.submitted");
        assertThat(row.getCorrelationId()).isEqualTo("corr-org-001");
        assertThat(row.getStatus()).isEqualTo(OrganizationOutboxEvent.STATUS_PENDING);
        assertThat(row.getPayloadJson()).contains("APP-2026-0820").contains("Ceylon Roast Co");

        // Must NOT send to RabbitMQ prior to AFTER_COMMIT phase
        verifyNoInteractions(rabbitTemplate);
        verify(applicationEventPublisher).publishEvent(any(OrganizationEventPublisher.OutboxSavedSignal.class));
    }

    @Test
    void attemptPublish_AfterApproval_PublishesToSwiftdropEventsAndMarksPublished() throws Exception {
        sampleApp.setStatus(MerchantApplicationStatus.APPROVED);
        sampleApp.setReviewedAt(LocalDateTime.now());
        sampleApp.setReviewNotes("Verified BRN");

        ArgumentCaptor<OrganizationOutboxEvent> savedCaptor = ArgumentCaptor.forClass(OrganizationOutboxEvent.class);
        when(outboxRepository.save(any(OrganizationOutboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        publisher.publishMerchantApplicationApproved(sampleApp, "admin@swiftdrop.lk");
        verify(outboxRepository).save(savedCaptor.capture());
        OrganizationOutboxEvent pending = savedCaptor.getValue();

        publisher.attemptPublish(pending);

        verify(rabbitTemplate).convertAndSend(
                eq("swiftdrop.events"),
                eq("organization.merchant.approved"),
                any(Map.class),
                any(MessagePostProcessor.class)
        );
        assertThat(pending.getStatus()).isEqualTo(OrganizationOutboxEvent.STATUS_PUBLISHED);
        assertThat(pending.getPublishedAt()).isNotNull();
    }

    @Test
    void attemptPublish_WhenBrokerFails_RetriesWithBackoffAndMarksFailedAtMaxRetries() {
        OrganizationOutboxEvent row = new OrganizationOutboxEvent();
        row.setEventId("evt-fail-01");
        row.setEventType("MerchantApplicationRejected");
        row.setRoutingKey("organization.merchant.rejected");
        row.setPayloadJson("{\"eventType\":\"MerchantApplicationRejected\",\"applicationCode\":\"APP-1\"}");
        row.setStatus(OrganizationOutboxEvent.STATUS_PENDING);
        row.setRetryCount(4);
        row.setMaxRetries(5);

        doThrow(new RuntimeException("RabbitMQ connection refused"))
                .when(rabbitTemplate)
                .convertAndSend(anyString(), anyString(), any(Object.class), any(MessagePostProcessor.class));

        publisher.attemptPublish(row);

        assertThat(row.getRetryCount()).isEqualTo(5);
        assertThat(row.getStatus()).isEqualTo(OrganizationOutboxEvent.STATUS_FAILED);
        assertThat(row.getLastError()).contains("RabbitMQ connection refused");
    }
}

