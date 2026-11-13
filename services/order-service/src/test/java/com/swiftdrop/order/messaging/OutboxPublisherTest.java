package com.swiftdrop.order.messaging;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpConnectException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.core.ReturnedMessage;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OutboxPublisherTest {

    private static final String EXCHANGE = "swiftdrop.events";
    private static final String KEY = "order.delivery.created.v1";

    @Mock private OutboxEventRepository outbox;
    @Mock private RabbitTemplate rabbitTemplate;
    @Mock private PlatformTransactionManager transactionManager;

    private OutboxPublisher publisher;

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        OutboxProperties properties = new OutboxProperties(true, 10, 1000, 200, 60);
        publisher = new OutboxPublisher(outbox, rabbitTemplate, properties, transactionManager, EXCHANGE);
    }

    private static OutboxEvent event(String payload) {
        return new OutboxEvent(UUID.randomUUID(), KEY, payload);
    }

    /** Makes the mocked broker answer the publisher confirm. */
    private void brokerConfirms(boolean ack) {
        doAnswer(invocation -> {
            CorrelationData correlation = invocation.getArgument(3);
            correlation.getFuture().complete(new CorrelationData.Confirm(ack, ack ? null : "nack"));
            return null;
        }).when(rabbitTemplate).send(eq(EXCHANGE), eq(KEY), any(Message.class), any(CorrelationData.class));
    }

    @Test
    @DisplayName("publishes a persistent JSON message and marks the event published once the broker confirms")
    void publishesAndMarksPublished() {
        OutboxEvent event = event("{\"eventType\":\"order.delivery.created\"}");
        when(outbox.lockNextBatch(10)).thenReturn(List.of(event));
        brokerConfirms(true);

        int published = publisher.publishPendingBatch();

        assertThat(published).isEqualTo(1);
        assertThat(event.getPublishedAt()).isNotNull();
        assertThat(event.getAttempts()).isZero();

        ArgumentCaptor<Message> sent = ArgumentCaptor.forClass(Message.class);
        verify(rabbitTemplate).send(eq(EXCHANGE), eq(KEY), sent.capture(), any(CorrelationData.class));
        Message message = sent.getValue();
        assertThat(new String(message.getBody(), StandardCharsets.UTF_8)).isEqualTo(event.getPayload());
        assertThat(message.getMessageProperties().getContentType()).isEqualTo(MessageProperties.CONTENT_TYPE_JSON);
        assertThat(message.getMessageProperties().getDeliveryMode()).isEqualTo(MessageDeliveryMode.PERSISTENT);
        assertThat(message.getMessageProperties().getMessageId()).isEqualTo(event.getEventId().toString());
    }

    @Test
    @DisplayName("a broker nack leaves the event unpublished and schedules a retry")
    void nackSchedulesRetry() {
        OutboxEvent event = event("{}");
        when(outbox.lockNextBatch(10)).thenReturn(List.of(event));
        brokerConfirms(false);

        int published = publisher.publishPendingBatch();

        assertThat(published).isZero();
        assertThat(event.getPublishedAt()).isNull();
        assertThat(event.getAttempts()).isEqualTo(1);
        assertThat(event.getNextAttemptAt()).isAfter(Instant.now());
        assertThat(event.getLastError()).isEqualTo("IllegalStateException");
    }

    @Test
    @DisplayName("when the broker is down the failing event is retried later and later events are not sent out of order")
    void brokerDownStopsBatch() {
        OutboxEvent first = event("{\"n\":1}");
        OutboxEvent second = event("{\"n\":2}");
        when(outbox.lockNextBatch(10)).thenReturn(List.of(first, second));
        doThrow(new AmqpConnectException(new IOException("connection refused")))
                .when(rabbitTemplate).send(eq(EXCHANGE), eq(KEY), any(Message.class), any(CorrelationData.class));

        int published = publisher.publishPendingBatch();

        assertThat(published).isZero();
        assertThat(first.getAttempts()).isEqualTo(1);
        assertThat(first.getPublishedAt()).isNull();
        assertThat(second.getAttempts()).as("second event is untouched").isZero();
        verify(rabbitTemplate, times(1)).send(eq(EXCHANGE), eq(KEY), any(Message.class), any(CorrelationData.class));
    }

    @Test
    @DisplayName("no confirm within the timeout counts as a failed attempt")
    void confirmTimeout() {
        OutboxEvent event = event("{}");
        when(outbox.lockNextBatch(10)).thenReturn(List.of(event));
        // the mocked template never completes the confirm future

        int published = publisher.publishPendingBatch();

        assertThat(published).isZero();
        assertThat(event.getAttempts()).isEqualTo(1);
        assertThat(event.getLastError()).isEqualTo("TimeoutException");
    }

    @Test
    @DisplayName("retry delay grows with each failed attempt and is capped")
    void backoffGrowsAndIsCapped() {
        OutboxEvent event = event("{}");
        when(outbox.lockNextBatch(10)).thenReturn(List.of(event));
        brokerConfirms(false);

        Instant start = Instant.now();
        for (int i = 0; i < 12; i++) {
            publisher.publishPendingBatch();
        }

        assertThat(event.getAttempts()).isEqualTo(12);
        // capped at maxBackoffSeconds (60) plus a little slack
        assertThat(event.getNextAttemptAt()).isBefore(start.plusSeconds(65));
        assertThat(event.getNextAttemptAt()).isAfter(start.plusSeconds(55));
    }

    @Test
    @DisplayName("an event the broker accepted but could not route is still treated as published")
    void unroutableIsPublished() {
        OutboxEvent event = event("{}");
        when(outbox.lockNextBatch(10)).thenReturn(List.of(event));
        doAnswer(invocation -> {
            Message message = invocation.getArgument(2);
            CorrelationData correlation = invocation.getArgument(3);
            correlation.setReturned(new ReturnedMessage(message, 312, "NO_ROUTE", EXCHANGE, KEY));
            correlation.getFuture().complete(new CorrelationData.Confirm(true, null));
            return null;
        }).when(rabbitTemplate).send(eq(EXCHANGE), eq(KEY), any(Message.class), any(CorrelationData.class));

        int published = publisher.publishPendingBatch();

        assertThat(published).isEqualTo(1);
        assertThat(event.getPublishedAt()).isNotNull();
    }

    @Test
    @DisplayName("nothing pending means nothing is sent")
    void emptyBatch() {
        when(outbox.lockNextBatch(10)).thenReturn(List.of());

        assertThat(publisher.publishPendingBatch()).isZero();
    }
}
