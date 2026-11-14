package com.swiftdrop.organization.messaging;

import com.swiftdrop.organization.config.CorrelationIdFilter;
import com.swiftdrop.organization.config.RabbitMQConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    private MerchantEventPublisher publisher;

    private static final String EXCHANGE = RabbitMQConfig.EVENTS_EXCHANGE;

    @BeforeEach
    void setUp() {
        publisher = new MerchantEventPublisher(rabbitTemplate, EXCHANGE);
    }

    @Test
    @DisplayName("RabbitMQConfig declares durable swiftdrop.events topic exchange matching publisher")
    void rabbitMQConfig_DeclaresDurableSwiftdropEventsExchange() {
        RabbitMQConfig config = new RabbitMQConfig();
        TopicExchange eventsExchange = config.eventsExchange(RabbitMQConfig.EVENTS_EXCHANGE);

        assertThat(eventsExchange.getName()).isEqualTo("swiftdrop.events");
        assertThat(eventsExchange.getName()).isEqualTo(publisher.getExchange());
        assertThat(eventsExchange.isDurable()).isTrue();
        assertThat(eventsExchange.isAutoDelete()).isFalse();
    }

    @Test
    @DisplayName("Publishes organization.merchant.approved.v1 event to swiftdrop.events exchange with correlationId")
    void onMerchantLifecycleEvent_Approved_Success() {
        MerchantLifecycleEvent event = new MerchantLifecycleEvent(
                "evt-1",
                MerchantEventType.APPROVED.eventType(),
                1,
                "2026-11-13T10:00:00Z",
                MerchantLifecycleEvent.PRODUCER,
                "corr-evt-1",
                10L,
                "user-123",
                "Fresh Mart",
                "APPROVED",
                "PENDING",
                null
        );

        AtomicReference<String> mdcDuringSend = new AtomicReference<>();
        doAnswer(invocation -> {
            mdcDuringSend.set(MDC.get(CorrelationIdFilter.MDC_KEY));
            return null;
        }).when(rabbitTemplate).convertAndSend(eq(EXCHANGE), eq("organization.merchant.approved.v1"), eq(event));

        publisher.onMerchantLifecycleEvent(event);

        verify(rabbitTemplate).convertAndSend(
                eq(EXCHANGE),
                eq("organization.merchant.approved.v1"),
                eq(event)
        );
        assertThat(event.correlationId()).isEqualTo("corr-evt-1");
        assertThat(mdcDuringSend.get()).isEqualTo("corr-evt-1");
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
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
                "corr-evt-2",
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
                "corr-evt-3",
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
                "corr-evt-4",
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
                "corr-evt-5",
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
