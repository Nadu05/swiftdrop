package com.swiftdrop.order.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.OrderStatusHistoryRepository;
import com.swiftdrop.order.support.ApplicationIntegrationTest;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * The event/integration flow end to end: order created over HTTP -> outbox row in the same transaction ->
 * relay publishes to a real RabbitMQ -> message arrives with the documented routing key and payload.
 */
class OrderEventIntegrationTest extends ApplicationIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private OutboxPublisher publisher;
    @Autowired private OutboxEventRepository outbox;
    @Autowired private DeliveryOrderRepository orders;
    @Autowired private RabbitTemplate rabbitTemplate;
    @Autowired private RabbitAdmin rabbitAdmin;
    @SpyBean private OrderStatusHistoryRepository historyRepository;

    @BeforeEach
    void cleanSlate() {
        rabbitAdmin.initialize(); // declares the exchange, queue and binding from RabbitMQConfig
        while (publisher.publishPendingBatch() > 0) {
            // flush events left over from other tests
        }
        while (rabbitTemplate.receive(EVENTS_QUEUE, 200) != null) {
            // drain the queue
        }
    }

    private String body() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pickupAddress", "45 Galle Road, Colombo 03");
        body.put("pickupContactName", "Nuwan Pradeep");
        body.put("pickupContactPhone", "+94 77 123 4567");
        body.put("dropoffAddress", "12/4 Peradeniya Road, Kandy");
        body.put("dropoffContactName", "Ayesha Perera");
        body.put("dropoffContactPhone", "0718849201");
        body.put("parcelSize", "SMALL");
        body.put("weightKg", 0.5);
        body.put("pickupCity", "COLOMBO");
        body.put("dropoffCity", "KANDY");
        return objectMapper.writeValueAsString(body);
    }

    private MvcResult create(long customerId, String idempotencyKey, String correlationId) throws Exception {
        var request = post("/api/v1/orders")
                .header("Authorization", "Bearer " + TestTokens.customer(customerId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body());
        if (idempotencyKey != null) {
            request.header("Idempotency-Key", idempotencyKey);
        }
        if (correlationId != null) {
            request.header("X-Correlation-Id", correlationId);
        }
        return mvc.perform(request).andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    @Test
    @DisplayName("creating an order records exactly one pending event, with ids only and no personal data")
    void recordsPendingEvent() throws Exception {
        long before = outbox.countByPublishedAtIsNull();

        JsonNode order = json(create(601, null, "corr-601"));

        assertThat(outbox.countByPublishedAtIsNull()).isEqualTo(before + 1);
        OutboxEvent event = outbox.findAll().stream()
                .filter(e -> e.getPayload().contains(order.get("trackingNumber").asText()))
                .findFirst().orElseThrow();
        assertThat(event.getRoutingKey()).isEqualTo("order.delivery.created.v1");
        assertThat(event.getPublishedAt()).isNull();

        JsonNode envelope = objectMapper.readTree(event.getPayload());
        assertThat(envelope.get("eventId").asText()).isEqualTo(event.getEventId().toString());
        assertThat(envelope.get("eventType").asText()).isEqualTo("order.delivery.created");
        assertThat(envelope.get("eventVersion").asInt()).isEqualTo(1);
        assertThat(envelope.get("producer").asText()).isEqualTo("order-service");
        assertThat(envelope.get("correlationId").asText()).as("taken from X-Correlation-Id").isEqualTo("corr-601");
        assertThat(envelope.get("occurredAt").asText()).isNotBlank();
        assertThat(envelope.get("data").get("deliveryId").asLong()).isEqualTo(order.get("id").asLong());
        assertThat(envelope.get("data").get("customerId").asLong()).isEqualTo(601L);
        assertThat(envelope.get("data").get("status").asText()).isEqualTo("CREATED");

        assertThat(event.getPayload())
                .as("no addresses, names or phone numbers in events")
                .doesNotContain("Galle", "Peradeniya", "Nuwan", "Ayesha", "0718849201", "123 4567");
    }

    @Test
    @DisplayName("the relay publishes the committed event to RabbitMQ and marks it published")
    void publishesToBroker() throws Exception {
        JsonNode order = json(create(602, null, null));

        int published = publisher.publishPendingBatch();
        assertThat(published).isGreaterThanOrEqualTo(1);

        Message message = rabbitTemplate.receive(EVENTS_QUEUE, 5000);
        assertThat(message).as("event delivered to the bound queue").isNotNull();
        assertThat(message.getMessageProperties().getReceivedRoutingKey()).isEqualTo("order.delivery.created.v1");
        // On a received message the broker-reported mode is in getReceivedDeliveryMode().
        assertThat(message.getMessageProperties().getReceivedDeliveryMode()).isEqualTo(MessageDeliveryMode.PERSISTENT);

        JsonNode envelope = objectMapper.readTree(new String(message.getBody(), StandardCharsets.UTF_8));
        assertThat(envelope.get("eventType").asText()).isEqualTo("order.delivery.created");
        assertThat(envelope.get("data").get("trackingNumber").asText()).isEqualTo(order.get("trackingNumber").asText());
        assertThat(message.getMessageProperties().getMessageId()).isEqualTo(envelope.get("eventId").asText());

        OutboxEvent stored = outbox.findAll().stream()
                .filter(e -> e.getEventId().toString().equals(envelope.get("eventId").asText()))
                .findFirst().orElseThrow();
        assertThat(stored.getPublishedAt()).isNotNull();
        assertThat(publisher.publishPendingBatch()).as("nothing is published twice").isZero();
    }

    @Test
    @DisplayName("a repeated idempotent request does not emit a second event")
    void idempotentRequestEmitsOneEvent() throws Exception {
        JsonNode first = json(create(603, "evt-key", null));
        json(create(603, "evt-key", null));

        long events = outbox.findAll().stream()
                .filter(e -> e.getPayload().contains(first.get("trackingNumber").asText()))
                .count();
        assertThat(events).isEqualTo(1);
    }

    @Test
    @DisplayName("if the order transaction fails, neither the order nor its event is stored")
    void rollbackLeavesNoOrderAndNoEvent() throws Exception {
        long ordersBefore = orders.count();
        long eventsBefore = outbox.count();
        doThrow(new IllegalStateException("simulated failure")).when(historyRepository).save(any());

        MvcResult result = create(604, null, null);

        assertThat(result.getResponse().getStatus()).isEqualTo(500);
        assertThat(orders.count()).isEqualTo(ordersBefore);
        assertThat(outbox.count()).isEqualTo(eventsBefore);
    }
}
