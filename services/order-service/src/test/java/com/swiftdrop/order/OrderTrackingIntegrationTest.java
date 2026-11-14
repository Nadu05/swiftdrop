package com.swiftdrop.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.messaging.OutboxEvent;
import com.swiftdrop.order.messaging.OutboxEventRepository;
import com.swiftdrop.order.messaging.OutboxPublisher;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.OrderStatusHistoryRepository;
import com.swiftdrop.order.support.ApplicationIntegrationTest;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * The delivery lifecycle end to end through the real security chain, PostgreSQL and RabbitMQ: a courier moves
 * an order along, the customer reads the private timeline and receipt, and a stranger reads the public tracking
 * page, which must never contain private data.
 */
class OrderTrackingIntegrationTest extends ApplicationIntegrationTest {

    private static final long COURIER = 9001L;

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DeliveryOrderRepository orders;
    @Autowired private OrderStatusHistoryRepository history;
    @Autowired private OutboxEventRepository outbox;
    @Autowired private OutboxPublisher publisher;
    @Autowired private RabbitTemplate rabbitTemplate;
    @Autowired private RabbitAdmin rabbitAdmin;

    // ------------------------------------------------------------------ helpers

    private JsonNode createOrder(long customerId) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pickupAddress", "45 Galle Road, Colombo 03");
        body.put("pickupContactName", "Nuwan Pradeep");
        body.put("pickupContactPhone", "+94 77 123 4567");
        body.put("dropoffAddress", "12/4 Peradeniya Road, Kandy");
        body.put("dropoffContactName", "Ayesha Perera");
        body.put("dropoffContactPhone", "0718849201");
        body.put("parcelDescription", "Electronic accessories");
        body.put("deliveryInstructions", "Leave with the security guard");
        body.put("parcelSize", "MEDIUM");
        body.put("weightKg", 1.5);
        body.put("pickupCity", "COLOMBO");
        body.put("dropoffCity", "KANDY");
        MvcResult result = mvc.perform(post("/api/v1/orders")
                .header("Authorization", "Bearer " + TestTokens.customer(customerId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        return json(result);
    }

    private MvcResult changeStatus(long orderId, String token, String status, String note, String location) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        if (note != null) {
            body.put("note", note);
        }
        if (location != null) {
            body.put("location", location);
        }
        return mvc.perform(patch("/api/v1/orders/" + orderId + "/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))).andReturn();
    }

    private MvcResult courierSets(long orderId, String status) throws Exception {
        return changeStatus(orderId, TestTokens.withRole(COURIER, "COURIER"), status, null, null);
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private MvcResult getAs(long customerId, String path) throws Exception {
        return mvc.perform(get(path).header("Authorization", "Bearer " + TestTokens.customer(customerId))).andReturn();
    }

    private List<OutboxEvent> statusEvents(String trackingNumber) {
        return outbox.findAll().stream()
                .filter(e -> "order.delivery.status-changed.v1".equals(e.getRoutingKey()))
                .filter(e -> e.getPayload().contains(trackingNumber))
                .toList();
    }

    // ------------------------------------------------------------------ lifecycle

    @Test
    @DisplayName("a courier moves an order through the whole lifecycle and the customer's timeline follows")
    void fullLifecycle() throws Exception {
        JsonNode order = createOrder(701);
        long id = order.get("id").asLong();

        assertThat(json(getAs(701, "/api/v1/orders/" + id + "/timeline")).get("events")).hasSize(1);

        MvcResult picked = changeStatus(id, TestTokens.withRole(COURIER, "COURIER"), "PICKED_UP", "Collected from sender", "Colombo 03");
        assertThat(picked.getResponse().getStatus()).isEqualTo(200);
        assertThat(json(picked).get("previousStatus").asText()).isEqualTo("CREATED");
        assertThat(json(picked).get("statusLabel").asText()).isEqualTo("Picked Up");
        assertThat(courierSets(id, "IN_TRANSIT").getResponse().getStatus()).isEqualTo(200);
        assertThat(courierSets(id, "OUT_FOR_DELIVERY").getResponse().getStatus()).isEqualTo(200);
        MvcResult delivered = changeStatus(id, TestTokens.withRole(COURIER, "COURIER"), "DELIVERED", "Handed to recipient", "Kandy");
        assertThat(delivered.getResponse().getStatus()).isEqualTo(200);

        JsonNode timeline = json(getAs(701, "/api/v1/orders/" + id + "/timeline"));
        assertThat(timeline.get("currentStatus").asText()).isEqualTo("DELIVERED");
        List<String> statuses = new ArrayList<>();
        timeline.get("events").forEach(e -> statuses.add(e.get("status").asText()));
        assertThat(statuses).containsExactly("CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED");
        assertThat(timeline.get("events").get(1).get("note").asText()).isEqualTo("Collected from sender");
        assertThat(timeline.get("events").get(1).get("location").asText()).isEqualTo("Colombo 03");
        assertThat(timeline.toString()).as("who made a change is not exposed").doesNotContain("changedBy");

        DeliveryOrder stored = orders.findById(id).orElseThrow();
        assertThat(stored.getStatus()).isEqualTo(OrderStatus.DELIVERED);
        List<OrderStatusHistory> rows = history.findByOrderIdOrderByCreatedAtAscIdAsc(id);
        assertThat(rows).extracting(OrderStatusHistory::getStatus).containsExactly(OrderStatus.CREATED,
                OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED);
        assertThat(rows.get(1).getChangedBy()).as("the actor is the courier's id from the token").isEqualTo(COURIER);
        assertThat(rows.get(0).getChangedBy()).isEqualTo(701L);

        assertThat(json(getAs(701, "/api/v1/orders/" + id)).get("status").asText()).isEqualTo("DELIVERED");
    }

    @Test
    @DisplayName("invalid moves are 422 and leave the order, history and events untouched")
    void invalidMoves() throws Exception {
        JsonNode order = createOrder(702);
        long id = order.get("id").asLong();
        String tracking = order.get("trackingNumber").asText();

        assertThat(courierSets(id, "DELIVERED").getResponse().getStatus()).as("cannot skip ahead").isEqualTo(422);
        assertThat(courierSets(id, "CREATED").getResponse().getStatus()).as("cannot repeat").isEqualTo(422);
        assertThat(courierSets(id, "PICKED_UP").getResponse().getStatus()).isEqualTo(200);
        assertThat(courierSets(id, "PICKED_UP").getResponse().getStatus()).as("a repeated request").isEqualTo(422);
        assertThat(courierSets(id, "CREATED").getResponse().getStatus()).as("cannot go back").isEqualTo(422);

        assertThat(courierSets(id, "FAILED").getResponse().getStatus()).isEqualTo(200);
        MvcResult afterFinal = courierSets(id, "IN_TRANSIT");
        assertThat(afterFinal.getResponse().getStatus()).as("FAILED is final").isEqualTo(422);
        assertThat(json(afterFinal).get("message").asText()).contains("can no longer change");

        assertThat(orders.findById(id).orElseThrow().getStatus()).isEqualTo(OrderStatus.FAILED);
        assertThat(history.findByOrderIdOrderByCreatedAtAscIdAsc(id)).hasSize(3); // CREATED, PICKED_UP, FAILED
        assertThat(statusEvents(tracking)).as("one event per real change").hasSize(2);
    }

    @Test
    @DisplayName("an unknown order and an invalid body are rejected")
    void unknownOrderAndBadBody() throws Exception {
        assertThat(courierSets(999_999_999L, "PICKED_UP").getResponse().getStatus()).isEqualTo(404);

        JsonNode order = createOrder(703);
        MvcResult bad = changeStatus(order.get("id").asLong(), TestTokens.withRole(COURIER, "COURIER"), "TELEPORTED", null, null);
        assertThat(bad.getResponse().getStatus()).isEqualTo(400);
    }

    // ------------------------------------------------------------------ who may do what

    @Test
    @DisplayName("customers cannot change a status, and no token or an unknown role is rejected")
    void statusChangeAuthorisation() throws Exception {
        JsonNode order = createOrder(704);
        long id = order.get("id").asLong();

        assertThat(changeStatus(id, TestTokens.customer(704), "PICKED_UP", null, null).getResponse().getStatus())
                .as("even the order's own customer").isEqualTo(403);
        assertThat(changeStatus(id, TestTokens.withRole(COURIER, "MERCHANT"), "PICKED_UP", null, null)
                .getResponse().getStatus()).isEqualTo(403);
        MvcResult anonymous = mvc.perform(patch("/api/v1/orders/" + id + "/status")
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PICKED_UP\"}")).andReturn();
        assertThat(anonymous.getResponse().getStatus()).isEqualTo(401);

        assertThat(orders.findById(id).orElseThrow().getStatus()).isEqualTo(OrderStatus.CREATED);
        for (String role : List.of("BRANCH_ADMIN", "ADMIN")) {
            long next = createOrder(704).get("id").asLong();
            assertThat(changeStatus(next, TestTokens.withRole(COURIER, role), "PICKED_UP", null, null)
                    .getResponse().getStatus()).as(role).isEqualTo(200);
        }
    }

    @Test
    @DisplayName("customers cannot read another customer's timeline or receipt (404, same as a missing order)")
    void ownership() throws Exception {
        long id = createOrder(705).get("id").asLong();

        assertThat(getAs(705, "/api/v1/orders/" + id + "/timeline").getResponse().getStatus()).isEqualTo(200);
        assertThat(getAs(705, "/api/v1/orders/" + id + "/receipt").getResponse().getStatus()).isEqualTo(200);
        assertThat(getAs(706, "/api/v1/orders/" + id + "/timeline").getResponse().getStatus()).isEqualTo(404);
        assertThat(getAs(706, "/api/v1/orders/" + id + "/receipt").getResponse().getStatus()).isEqualTo(404);
        assertThat(getAs(705, "/api/v1/orders/999999999/timeline").getResponse().getStatus()).isEqualTo(404);
        assertThat(getAs(705, "/api/v1/orders/999999999/receipt").getResponse().getStatus()).isEqualTo(404);

        MvcResult courier = mvc.perform(get("/api/v1/orders/" + id + "/timeline")
                .header("Authorization", "Bearer " + TestTokens.withRole(COURIER, "COURIER"))).andReturn();
        assertThat(courier.getResponse().getStatus()).as("the customer-facing timeline is not for couriers").isEqualTo(403);
        MvcResult anonymous = mvc.perform(get("/api/v1/orders/" + id + "/receipt")).andReturn();
        assertThat(anonymous.getResponse().getStatus()).isEqualTo(401);
    }

    // ------------------------------------------------------------------ receipt

    @Test
    @DisplayName("the receipt matches what was charged and stays the same after delivery")
    void receipt() throws Exception {
        JsonNode order = createOrder(707);
        long id = order.get("id").asLong();

        JsonNode before = json(getAs(707, "/api/v1/orders/" + id + "/receipt"));
        assertThat(before.get("trackingNumber").asText()).isEqualTo(order.get("trackingNumber").asText());
        assertThat(before.get("totalFee").decimalValue()).isEqualByComparingTo("1693.40");
        assertThat(before.get("totalFee").decimalValue()).isEqualByComparingTo(order.get("deliveryFee").decimalValue());
        assertThat(before.get("feeBreakdown").get("baseFee").decimalValue()).isEqualByComparingTo("500.00");
        assertThat(before.get("feeBreakdown").get("weightFee").decimalValue()).isEqualByComparingTo("50.00");
        assertThat(before.get("feeBreakdown").get("distanceFee").decimalValue()).isEqualByComparingTo("943.40");
        assertThat(before.get("feeBreakdown").get("zoneSurcharge").decimalValue()).isEqualByComparingTo("200.00");
        assertThat(before.get("currency").asText()).isEqualTo("LKR");
        assertThat(before.get("pickupCity").asText()).isEqualTo("COLOMBO");
        assertThat(before.get("dropoffCity").asText()).isEqualTo("KANDY");
        assertThat(before.get("dropoffAddress").asText()).isEqualTo("12/4 Peradeniya Road, Kandy");
        assertThat(before.get("deliveredAt").isNull()).isTrue();
        assertThat(before.has("pickupContactPhone")).as("no phone numbers on a receipt").isFalse();

        courierSets(id, "PICKED_UP");
        courierSets(id, "IN_TRANSIT");
        courierSets(id, "OUT_FOR_DELIVERY");
        courierSets(id, "DELIVERED");

        JsonNode after = json(getAs(707, "/api/v1/orders/" + id + "/receipt"));
        assertThat(after.get("status").asText()).isEqualTo("DELIVERED");
        assertThat(after.get("deliveredAt").isNull()).isFalse();
        assertThat(after.get("totalFee").decimalValue()).isEqualByComparingTo(before.get("totalFee").decimalValue());
        assertThat(after.get("feeBreakdown")).isEqualTo(before.get("feeBreakdown"));
    }

    // ------------------------------------------------------------------ public tracking

    @Test
    @DisplayName("public tracking needs no login, follows the timeline and exposes nothing private")
    void publicTracking() throws Exception {
        JsonNode order = createOrder(708);
        long id = order.get("id").asLong();
        String number = order.get("trackingNumber").asText();
        changeStatus(id, TestTokens.withRole(COURIER, "COURIER"), "PICKED_UP",
                "Gate code 4455, ring bell at 12/4 Peradeniya Road", "Nuwan's shop, Galle Road");
        courierSets(id, "IN_TRANSIT");

        for (String path : List.of("/api/v1/tracking/", "/api/v1/orders/tracking/", "/tracking/", "/orders/tracking/")) {
            MvcResult result = mvc.perform(get(path + number)).andReturn();
            assertThat(result.getResponse().getStatus()).as(path).isEqualTo(200);
            assertThat(result.getResponse().getHeader("Cache-Control")).isEqualTo("no-store");
        }

        MvcResult result = mvc.perform(get("/api/v1/tracking/" + number)).andReturn();
        JsonNode tracking = json(result);
        assertThat(tracking.get("trackingNumber").asText()).isEqualTo(number);
        assertThat(tracking.get("status").asText()).isEqualTo("IN_TRANSIT");
        assertThat(tracking.get("statusLabel").asText()).isEqualTo("In Transit");
        assertThat(tracking.get("origin").asText()).isEqualTo("Colombo");
        assertThat(tracking.get("destination").asText()).isEqualTo("Kandy");
        List<String> labels = new ArrayList<>();
        tracking.get("events").forEach(e -> labels.add(e.get("statusLabel").asText()));
        assertThat(labels).containsExactly("Created", "Picked Up", "In Transit");

        String raw = result.getResponse().getContentAsString();
        assertThat(raw).as("no private data in the public JSON")
                .doesNotContain("Galle", "Peradeniya", "Nuwan", "Ayesha", "0718849201", "771234567", "security guard",
                        "Electronic", "Gate code", "4455", "customerId", "branchId", "changedBy", "deliveryFee",
                        "idempotency", "pickupAddress", "dropoffAddress", "ContactPhone", "\"note\"",
                        "\"location\"");
        assertThat(tracking.has("id")).isFalse();
    }

    @Test
    @DisplayName("tracking follows the status the moment it changes, and shows a failed delivery in a generic way")
    void trackingIsLiveAndGenericWhenFailed() throws Exception {
        JsonNode order = createOrder(709);
        long id = order.get("id").asLong();
        String number = order.get("trackingNumber").asText();

        assertThat(json(mvc.perform(get("/api/v1/tracking/" + number)).andReturn()).get("status").asText())
                .isEqualTo("CREATED");
        changeStatus(id, TestTokens.withRole(COURIER, "COURIER"), "FAILED", "Recipient refused: owes money to Ayesha", null);

        MvcResult result = mvc.perform(get("/api/v1/tracking/" + number)).andReturn();
        JsonNode tracking = json(result);
        assertThat(tracking.get("status").asText()).isEqualTo("FAILED");
        JsonNode last = tracking.get("events").get(tracking.get("events").size() - 1);
        assertThat(last.get("description").asText()).isEqualTo("Delivery could not be completed");
        assertThat(result.getResponse().getContentAsString()).doesNotContain("refused", "owes");
    }

    @Test
    @DisplayName("an expired, invalid or customer token does not break public tracking")
    void trackingIgnoresTokens() throws Exception {
        String number = createOrder(710).get("trackingNumber").asText();

        for (String token : List.of("garbage", TestTokens.customer(710), TestTokens.withRole(1, "COURIER"),
                TestTokens.token("another-secret-another-secret-123456789", "1", "CUSTOMER",
                        java.time.Instant.now().plusSeconds(60)))) {
            MvcResult result = mvc.perform(get("/api/v1/tracking/" + number).header("Authorization", "Bearer " + token)).andReturn();
            assertThat(result.getResponse().getStatus()).isEqualTo(200);
        }
    }

    @Test
    @DisplayName("unknown and malformed tracking numbers give the same 404 and leak nothing")
    void unknownTrackingNumber() throws Exception {
        MvcResult unknown = mvc.perform(get("/api/v1/tracking/SD-261113-ZZZZ9999")).andReturn();
        MvcResult malformed = mvc.perform(get("/api/v1/tracking/not-a-number")).andReturn();
        MvcResult sequentialGuess = mvc.perform(get("/api/v1/tracking/1")).andReturn();

        for (MvcResult result : List.of(unknown, malformed, sequentialGuess)) {
            assertThat(result.getResponse().getStatus()).isEqualTo(404);
            assertThat(json(result).get("message").asText()).isEqualTo("Tracking number not found");
        }
    }

    @Test
    @DisplayName("tracking is not case sensitive")
    void trackingCaseInsensitive() throws Exception {
        String number = createOrder(711).get("trackingNumber").asText();

        MvcResult result = mvc.perform(get("/api/v1/tracking/" + number.toLowerCase())).andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(json(result).get("trackingNumber").asText()).isEqualTo(number);
    }

    // ------------------------------------------------------------------ events

    @Test
    @DisplayName("each status change records one event with ids only, and the relay delivers it to RabbitMQ")
    void statusChangedEvent() throws Exception {
        rabbitAdmin.initialize();
        while (publisher.publishPendingBatch() > 0) {
            // flush events left over from other tests
        }
        while (rabbitTemplate.receive(EVENTS_QUEUE, 200) != null) {
            // drain the queue
        }
        JsonNode order = createOrder(712);
        long id = order.get("id").asLong();
        String tracking = order.get("trackingNumber").asText();

        changeStatus(id, TestTokens.withRole(COURIER, "COURIER"), "PICKED_UP", "Call Nuwan on 0771234567", "Galle Road");

        List<OutboxEvent> events = statusEvents(tracking);
        assertThat(events).hasSize(1);
        JsonNode envelope = objectMapper.readTree(events.get(0).getPayload());
        assertThat(envelope.get("eventType").asText()).isEqualTo("order.delivery.status-changed");
        assertThat(envelope.get("eventVersion").asInt()).isEqualTo(1);
        assertThat(envelope.get("producer").asText()).isEqualTo("order-service");
        assertThat(envelope.get("data").get("deliveryId").asLong()).isEqualTo(id);
        assertThat(envelope.get("data").get("trackingNumber").asText()).isEqualTo(tracking);
        assertThat(envelope.get("data").get("customerId").asLong()).isEqualTo(712L);
        assertThat(envelope.get("data").get("previousStatus").asText()).isEqualTo("CREATED");
        assertThat(envelope.get("data").get("status").asText()).isEqualTo("PICKED_UP");
        assertThat(envelope.get("data").get("changedAt").asText()).isNotBlank();
        assertThat(events.get(0).getPayload()).as("no notes, locations or personal data")
                .doesNotContain("Nuwan", "0771234567", "Galle", "Peradeniya", "Ayesha");

        publisher.publishPendingBatch();
        List<String> routingKeys = new ArrayList<>();
        Message message;
        while ((message = rabbitTemplate.receive(EVENTS_QUEUE, 2000)) != null) {
            String body = new String(message.getBody(), StandardCharsets.UTF_8);
            if (body.contains(tracking)) {
                routingKeys.add(message.getMessageProperties().getReceivedRoutingKey());
            }
        }
        assertThat(routingKeys).containsExactlyInAnyOrder("order.delivery.created.v1", "order.delivery.status-changed.v1");
    }

    // ------------------------------------------------------------------ concurrency

    @Test
    @DisplayName("two simultaneous identical requests: exactly one wins, with one history entry and one event")
    void concurrentChangesApplyOnce() throws Exception {
        JsonNode order = createOrder(713);
        long id = order.get("id").asLong();
        String tracking = order.get("trackingNumber").asText();
        String token = TestTokens.withRole(COURIER, "COURIER");

        int threads = 6;
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            List<Future<Integer>> results = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                Callable<Integer> task = () -> {
                    ready.countDown();
                    go.await();
                    return changeStatus(id, token, "PICKED_UP", null, null).getResponse().getStatus();
                };
                results.add(pool.submit(task));
            }
            ready.await();
            go.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> result : results) {
                statuses.add(result.get());
            }
            assertThat(statuses.stream().filter(s -> s == 200).count()).as("exactly one success: %s", statuses).isEqualTo(1);
            assertThat(statuses.stream().filter(s -> s == 422).count()).as("the rest are rejected: %s", statuses).isEqualTo(threads - 1);
        } finally {
            pool.shutdownNow();
        }

        assertThat(history.findByOrderIdOrderByCreatedAtAscIdAsc(id)).hasSize(2); // CREATED + one PICKED_UP
        assertThat(statusEvents(tracking)).hasSize(1);
    }
}
