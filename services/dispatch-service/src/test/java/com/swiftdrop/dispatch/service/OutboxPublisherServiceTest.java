package com.swiftdrop.dispatch.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.entity.OutboxEvent;
import com.swiftdrop.dispatch.entity.enums.OutboxStatus;
import com.swiftdrop.dispatch.event.CourierAssignedEventData;
import com.swiftdrop.dispatch.event.DispatchEvent;
import com.swiftdrop.dispatch.repository.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpConnectException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxPublisherServiceTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    private ObjectMapper objectMapper;
    private OutboxPublisherService outboxPublisherService;
    private final String exchange = "swiftdrop.events";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
        outboxPublisherService = new OutboxPublisherService(
                outboxEventRepository,
                rabbitTemplate,
                objectMapper,
                exchange
        );
    }

    @Test
    @DisplayName("Test 1: Successfully save outbox event and immediately publish to RabbitMQ")
    void test1_SuccessfulSaveAndPublish() {
        CourierAssignedEventData data = new CourierAssignedEventData(1L, 101L, 5L, 100L, "ASSIGNED");
        DispatchEvent<CourierAssignedEventData> event = new DispatchEvent<>(
                UUID.randomUUID().toString(),
                "dispatch.courier.assigned",
                1,
                LocalDateTime.now(),
                "dispatch-service",
                null,
                data
        );

        when(outboxEventRepository.saveAndFlush(any(OutboxEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        OutboxEvent result = outboxPublisherService.saveAndPublish("dispatch.courier.assigned.v1", event);

        assertThat(result).isNotNull();
        assertThat(result.getEventId()).isEqualTo(event.getEventId());
        assertThat(result.getEventType()).isEqualTo("dispatch.courier.assigned");
        assertThat(result.getRoutingKey()).isEqualTo("dispatch.courier.assigned.v1");
        assertThat(result.getStatus()).isEqualTo(OutboxStatus.PUBLISHED);
        assertThat(result.getPublishedAt()).isNotNull();

        verify(rabbitTemplate).convertAndSend(eq(exchange), eq("dispatch.courier.assigned.v1"), any(Object.class));
    }

    @Test
    @DisplayName("Test 2: RabbitMQ connection failure marks outbox event FAILED without throwing exception")
    void test2_RabbitMQConnectionFailureHandledSafely() {
        CourierAssignedEventData data = new CourierAssignedEventData(1L, 101L, 5L, 100L, "ASSIGNED");
        DispatchEvent<CourierAssignedEventData> event = new DispatchEvent<>(
                UUID.randomUUID().toString(),
                "dispatch.courier.assigned",
                1,
                LocalDateTime.now(),
                "dispatch-service",
                null,
                data
        );

        when(outboxEventRepository.saveAndFlush(any(OutboxEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        doThrow(new AmqpConnectException(new java.net.ConnectException("Connection refused")))
                .when(rabbitTemplate).convertAndSend(eq(exchange), eq("dispatch.courier.assigned.v1"), any(Object.class));

        // Must not throw an exception to caller
        OutboxEvent result = outboxPublisherService.saveAndPublish("dispatch.courier.assigned.v1", event);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(OutboxStatus.FAILED);
        assertThat(result.getRetryCount()).isEqualTo(1);
        assertThat(result.getErrorMessage()).contains("Connection refused");
        assertThat(result.getPublishedAt()).isNull();
    }

    @Test
    @DisplayName("Test 3: Scheduled poller successfully retries pending/failed outbox events")
    void test3_ScheduledRetryPublishesPendingEvents() {
        OutboxEvent pendingEvent = new OutboxEvent(
                "evt-123",
                "dispatch.courier.assigned",
                1,
                "dispatch.courier.assigned.v1",
                "{\"eventId\":\"evt-123\"}",
                LocalDateTime.now()
        );
        pendingEvent.setStatus(OutboxStatus.FAILED);
        pendingEvent.setRetryCount(1);

        when(outboxEventRepository.findPendingForProcessing(any(), any(Pageable.class)))
                .thenReturn(List.of(pendingEvent));
        when(outboxEventRepository.saveAndFlush(any(OutboxEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        int processed = outboxPublisherService.processPendingEvents();

        assertThat(processed).isEqualTo(1);
        assertThat(pendingEvent.getStatus()).isEqualTo(OutboxStatus.PUBLISHED);
        assertThat(pendingEvent.getPublishedAt()).isNotNull();

        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(rabbitTemplate).convertAndSend(eq(exchange), eq("dispatch.courier.assigned.v1"), payloadCaptor.capture());
        assertThat(payloadCaptor.getValue()).isInstanceOf(DispatchEvent.class);
        assertThat(((DispatchEvent<?>) payloadCaptor.getValue()).getEventId()).isEqualTo("evt-123");
    }

    @Test
    @DisplayName("Test 4: Exceeding max retries marks event DEAD_LETTER")
    void test4_MaxRetriesExceededMarksDeadLetter() {
        OutboxEvent failedEvent = new OutboxEvent(
                "evt-fail",
                "dispatch.courier.assigned",
                1,
                "dispatch.courier.assigned.v1",
                "{}",
                LocalDateTime.now()
        );
        failedEvent.setStatus(OutboxStatus.FAILED);
        failedEvent.setRetryCount(4);
        failedEvent.setMaxRetries(5);

        doThrow(new AmqpConnectException(new java.net.ConnectException("Broker offline")))
                .when(rabbitTemplate).convertAndSend(eq(exchange), eq("dispatch.courier.assigned.v1"), any(Object.class));

        outboxPublisherService.publishSingleEvent(failedEvent, null);

        assertThat(failedEvent.getStatus()).isEqualTo(OutboxStatus.DEAD_LETTER);
        assertThat(failedEvent.getRetryCount()).isEqualTo(5);
        assertThat(failedEvent.getErrorMessage()).contains("Broker offline");
    }

    @Test
    @DisplayName("Test 5: Malformed outbox JSON payload marks event DEAD_LETTER without invoking broker")
    void test5_MalformedPayloadMarksDeadLetter() {
        OutboxEvent corruptEvent = new OutboxEvent(
                "evt-corrupt",
                "dispatch.courier.assigned",
                1,
                "dispatch.courier.assigned.v1",
                "{invalid-json",
                LocalDateTime.now()
        );

        when(outboxEventRepository.saveAndFlush(any(OutboxEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        boolean result = outboxPublisherService.publishSingleEvent(corruptEvent, null);

        assertThat(result).isFalse();
        assertThat(corruptEvent.getStatus()).isEqualTo(OutboxStatus.DEAD_LETTER);
        assertThat(corruptEvent.getErrorMessage()).contains("Outbox payload deserialization error");
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class));
    }
}

