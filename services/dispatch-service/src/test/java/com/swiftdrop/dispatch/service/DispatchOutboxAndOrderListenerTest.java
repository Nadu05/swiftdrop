package com.swiftdrop.dispatch.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.config.CorrelationIdHolder;
import com.swiftdrop.dispatch.dto.CreateOperationalTaskRequest;
import com.swiftdrop.dispatch.entity.DispatchOutboxEvent;
import com.swiftdrop.dispatch.entity.DispatchProcessedEvent;
import com.swiftdrop.dispatch.repository.DispatchOutboxEventRepository;
import com.swiftdrop.dispatch.repository.DispatchProcessedEventRepository;
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

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DispatchOutboxAndOrderListenerTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private DispatchOutboxEventRepository outboxRepository;

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @Mock
    private DispatchService dispatchService;

    @Mock
    private DispatchProcessedEventRepository processedEventRepository;

    private DispatchEventPublisher eventPublisher;
    private OrderEventListener orderEventListener;

    @BeforeEach
    void setUp() {
        eventPublisher = new DispatchEventPublisher(
                rabbitTemplate,
                "swiftdrop.events",
                outboxRepository,
                applicationEventPublisher,
                new ObjectMapper()
        );
        orderEventListener = new OrderEventListener(dispatchService, processedEventRepository);
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void publishEvent_StoresOutboxBeforeCommitAndPublishesAfterCommit() {
        MDC.put(CorrelationIdHolder.MDC_KEY, "corr-disp-11");
        when(outboxRepository.save(any(DispatchOutboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        eventPublisher.publishEvent(
                "dispatch.transfer.dispatched",
                "TransferManifestDispatched",
                Map.of(
                        "manifestCode", "TMF-2026-001",
                        "originBranchId", 1L,
                        "destinationBranchId", 2L,
                        "trackingNumbers", List.of("SD-10001")
                )
        );

        ArgumentCaptor<DispatchOutboxEvent> captor = ArgumentCaptor.forClass(DispatchOutboxEvent.class);
        verify(outboxRepository).save(captor.capture());
        DispatchOutboxEvent row = captor.getValue();

        assertThat(row.getEventType()).isEqualTo("TransferManifestDispatched");
        assertThat(row.getCorrelationId()).isEqualTo("corr-disp-11");
        assertThat(row.getStatus()).isEqualTo(DispatchOutboxEvent.STATUS_PENDING);
        verifyNoInteractions(rabbitTemplate);
        verify(applicationEventPublisher).publishEvent(any(DispatchEventPublisher.OutboxSavedSignal.class));

        eventPublisher.attemptPublish(row);
        verify(rabbitTemplate).convertAndSend(
                eq("swiftdrop.events"),
                eq("dispatch.transfer.dispatched"),
                any(Map.class),
                any(MessagePostProcessor.class)
        );
        assertThat(row.getStatus()).isEqualTo(DispatchOutboxEvent.STATUS_PUBLISHED);
    }

    @Test
    void orderEventListener_HandlesOrderConfirmedAndDeduplicatesDuplicateEventId() {
        Map<String, Object> event = Map.of(
                "eventId", "evt-order-conf-001",
                "eventType", "OrderConfirmed",
                "correlationId", "corr-e2e-77",
                "orderId", "77",
                "trackingNumber", "SD-77001",
                "pickupMethod", "COURIER_PICKUP"
        );

        when(processedEventRepository.existsByEventIdAndConsumerGroup("evt-order-conf-001", OrderEventListener.CONSUMER_GROUP))
                .thenReturn(false)
                .thenReturn(true);

        orderEventListener.handleDomainEvent(event);
        orderEventListener.handleDomainEvent(event); // duplicate redelivery

        verify(dispatchService, times(1)).handleOrderCreatedEvent(any(CreateOperationalTaskRequest.class));
        verify(processedEventRepository, times(1)).save(any(DispatchProcessedEvent.class));
    }

    @Test
    void orderEventListener_SkipsPendingPrepaidOrderCreatedUntilOrderConfirmed() {
        Map<String, Object> pendingPrepaidCreated = Map.of(
                "eventId", "evt-order-pend-001",
                "eventType", "OrderCreated",
                "orderId", "88",
                "trackingNumber", "SD-88001",
                "pickupMethod", "COURIER_PICKUP",
                "paymentMethod", "PREPAID",
                "paymentStatus", "PENDING_PAYMENT"
        );

        when(processedEventRepository.existsByEventIdAndConsumerGroup("evt-order-pend-001", OrderEventListener.CONSUMER_GROUP))
                .thenReturn(false);

        orderEventListener.handleDomainEvent(pendingPrepaidCreated);

        verifyNoInteractions(dispatchService);
        verify(processedEventRepository).save(any(DispatchProcessedEvent.class));
    }

    @Test
    void orderEventListener_RethrowsOnProcessingErrorForRetryAndDeadLetterQueue() {
        Map<String, Object> event = Map.of(
                "eventId", "evt-fail-99",
                "eventType", "OrderConfirmed",
                "orderId", "99",
                "trackingNumber", "SD-99001",
                "pickupMethod", "COURIER_PICKUP"
        );

        when(processedEventRepository.existsByEventIdAndConsumerGroup("evt-fail-99", OrderEventListener.CONSUMER_GROUP))
                .thenReturn(false);
        doThrow(new RuntimeException("Order Service unavailable"))
                .when(dispatchService).handleOrderCreatedEvent(any(CreateOperationalTaskRequest.class));

        assertThatThrownBy(() -> orderEventListener.handleDomainEvent(event))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Order Service unavailable");

        verify(processedEventRepository, never()).save(any(DispatchProcessedEvent.class));
    }
}

