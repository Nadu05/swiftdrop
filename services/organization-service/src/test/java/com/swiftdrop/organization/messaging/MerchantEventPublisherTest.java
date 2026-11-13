package com.swiftdrop.organization.messaging;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    private MerchantEventPublisher publisher;

    private static final String EXCHANGE = "swiftdrop.events";

    @BeforeEach
    void setUp() {
        publisher = new MerchantEventPublisher(rabbitTemplate, EXCHANGE);
    }

    @Test
    @DisplayName("Publishes organization.merchant.approved.v1 event to swiftdrop.events exchange")
    void onMerchantLifecycleEvent_Approved_Success() {
        MerchantLifecycleEvent event = new MerchantLifecycleEvent(
                "evt-1",
                MerchantEventType.APPROVED.eventType(),
                1,
                "2026-11-13T10:00:00Z",
                MerchantLifecycleEvent.PRODUCER,
                10L,
                "user-123",
                "Fresh Mart",
                "APPROVED",
                "PENDING",
                null
        );

        publisher.onMerchantLifecycleEvent(event);

        verify(rabbitTemplate).convertAndSend(
                eq(EXCHANGE),
                eq("organization.merchant.approved.v1"),
                eq(event)
        );
    }

    @Test
    @DisplayName("Publishes organization.merchant.rejected.v1 event with reason")
    void onMerchantLifecycleEvent_Rejected_Success() {
        MerchantLifecycleEvent event = new MerchantLifecycleEvent(
                "evt-2",
                MerchantEventType.REJECTED.eventType(),
                1,
                "2026-11-13T10:00:00Z",
                MerchantLifecycleEvent.PRODUCER,
                10L,
                "user-123",
                "Fresh Mart",
                "REJECTED",
                "PENDING",
                "Invalid document"
        );

        publisher.onMerchantLifecycleEvent(event);

        verify(rabbitTemplate).convertAndSend(
                eq(EXCHANGE),
                eq("organization.merchant.rejected.v1"),
                eq(event)
        );
    }

    @Test
    @DisplayName("Publishes organization.merchant.suspended.v1 and reactivated.v1 events correctly")
    void onMerchantLifecycleEvent_SuspendedAndReactivated() {
        MerchantLifecycleEvent suspendedEvent = new MerchantLifecycleEvent(
                "evt-3",
                MerchantEventType.SUSPENDED.eventType(),
                1,
                "2026-11-13T10:00:00Z",
                MerchantLifecycleEvent.PRODUCER,
                10L,
                "user-123",
                "Fresh Mart",
                "SUSPENDED",
                "APPROVED",
                "Payment default"
        );
        publisher.onMerchantLifecycleEvent(suspendedEvent);
        verify(rabbitTemplate).convertAndSend(eq(EXCHANGE), eq("organization.merchant.suspended.v1"), eq(suspendedEvent));

        MerchantLifecycleEvent reactivatedEvent = new MerchantLifecycleEvent(
                "evt-4",
                MerchantEventType.REACTIVATED.eventType(),
                1,
                "2026-11-13T10:00:00Z",
                MerchantLifecycleEvent.PRODUCER,
                10L,
                "user-123",
                "Fresh Mart",
                "APPROVED",
                "SUSPENDED",
                null
        );
        publisher.onMerchantLifecycleEvent(reactivatedEvent);
        verify(rabbitTemplate).convertAndSend(eq(EXCHANGE), eq("organization.merchant.reactivated.v1"), eq(reactivatedEvent));
    }

    @Test
    @DisplayName("Gracefully handles AmqpException without propagating failure")
    void onMerchantLifecycleEvent_AmqpException_HandledGracefully() {
        MerchantLifecycleEvent event = new MerchantLifecycleEvent(
                "evt-5",
                MerchantEventType.APPROVED.eventType(),
                1,
                "2026-11-13T10:00:00Z",
                MerchantLifecycleEvent.PRODUCER,
                10L,
                "user-123",
                "Fresh Mart",
                "APPROVED",
                "PENDING",
                null
        );

        doThrow(new AmqpException("Broker unavailable"))
                .when(rabbitTemplate).convertAndSend(anyString(), anyString(), any(Object.class));

        assertThatNoException().isThrownBy(() -> publisher.onMerchantLifecycleEvent(event));
    }
}
