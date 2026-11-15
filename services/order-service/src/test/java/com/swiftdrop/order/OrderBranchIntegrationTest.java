package com.swiftdrop.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.support.ApplicationIntegrationTest;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Branch resolution through the real Spring wiring, real HTTP and a real database. A tiny HTTP server plays the
 * Organization service: Colombo pickups are covered by branch 7, Jaffna is not covered (422), Kandy makes the
 * service fail (500).
 */
@TestPropertySource(properties = "swiftdrop.organization.branch-resolution-enabled=true")
class OrderBranchIntegrationTest extends ApplicationIntegrationTest {

    private static final HttpServer ORGANIZATION = startOrganizationStub();
    private static final AtomicInteger CALLS = new AtomicInteger();
    private static final AtomicReference<String> LAST_REQUEST = new AtomicReference<>();

    @DynamicPropertySource
    static void organizationProperties(DynamicPropertyRegistry registry) {
        registry.add("swiftdrop.organization.base-url", () -> "http://localhost:" + ORGANIZATION.getAddress().getPort());
    }

    @AfterAll
    static void stopStub() {
        ORGANIZATION.stop(0);
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DeliveryOrderRepository orders;

    @BeforeEach
    void reset() {
        CALLS.set(0);
        LAST_REQUEST.set(null);
    }

    private static HttpServer startOrganizationStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/api/v1/branches/resolve", exchange -> {
                CALLS.incrementAndGet();
                String request = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                LAST_REQUEST.set(request);
                int status;
                String body;
                if (request.contains("\"latitude\":6.9271")) { // Colombo
                    status = 200;
                    body = "{\"branchId\":7,\"branchCode\":\"CMB-CEN\",\"branchName\":\"Colombo Central\","
                            + "\"distanceKm\":2.81,\"eligible\":true}";
                } else if (request.contains("\"latitude\":9.6615")) { // Jaffna
                    status = 422;
                    body = "{\"message\":\"No active service area covers the location\"}";
                } else {
                    status = 500;
                    body = "{\"message\":\"boom\"}";
                }
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(status, bytes.length);
                exchange.getResponseBody().write(bytes);
                exchange.close();
            });
            server.start();
            return server;
        } catch (IOException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private MvcResult create(String pickupCity, String idempotencyKey) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pickupAddress", "45 Galle Road, Colombo 03");
        body.put("pickupContactName", "Nuwan Pradeep");
        body.put("pickupContactPhone", "+94 77 123 4567");
        body.put("dropoffAddress", "12/4 Peradeniya Road, Kandy");
        body.put("dropoffContactName", "Ayesha Perera");
        body.put("dropoffContactPhone", "0718849201");
        body.put("parcelSize", "MEDIUM");
        body.put("weightKg", 1.5);
        body.put("pickupCity", pickupCity);
        body.put("dropoffCity", "KANDY");
        var request = post("/api/v1/orders")
                .header("Authorization", "Bearer " + TestTokens.customer(610))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
        if (idempotencyKey != null) {
            request.header("Idempotency-Key", idempotencyKey);
        }
        return mvc.perform(request).andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    @Test
    @DisplayName("the branch chosen by the Organization service is stored on the order and returned")
    void branchIsStored() throws Exception {
        MvcResult result = create("COLOMBO", null);

        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        JsonNode json = json(result);
        assertThat(json.get("branchId").asLong()).isEqualTo(7L);
        DeliveryOrder stored = orders.findById(json.get("id").asLong()).orElseThrow();
        assertThat(stored.getBranchId()).isEqualTo(7L);
        assertThat(LAST_REQUEST.get()).contains("\"latitude\":6.9271").contains("\"longitude\":79.8612");
    }

    @Test
    @DisplayName("a pickup no service area covers is a 422 and no order is stored")
    void pickupNotServed() throws Exception {
        long before = orders.count();

        MvcResult result = create("JAFFNA", null);

        assertThat(result.getResponse().getStatus()).isEqualTo(422);
        assertThat(json(result).get("message").asText()).contains("pickup area");
        assertThat(orders.count()).isEqualTo(before);
    }

    @Test
    @DisplayName("an Organization service failure is a 503 with a retry message and no order is stored")
    void organizationDown() throws Exception {
        long before = orders.count();

        MvcResult result = create("KANDY", null);

        assertThat(result.getResponse().getStatus()).isEqualTo(503);
        assertThat(json(result).get("message").asText()).contains("try again");
        assertThat(orders.count()).isEqualTo(before);
    }

    @Test
    @DisplayName("repeating a request with the same Idempotency-Key returns the same order without asking again")
    void idempotentReplay() throws Exception {
        MvcResult first = create("COLOMBO", "branch-key-1");
        int callsAfterFirst = CALLS.get();
        MvcResult second = create("COLOMBO", "branch-key-1");

        assertThat(first.getResponse().getStatus()).isEqualTo(201);
        assertThat(json(second).get("id").asLong()).isEqualTo(json(first).get("id").asLong());
        assertThat(callsAfterFirst).isEqualTo(1);
        assertThat(CALLS.get()).as("the replay does not call the Organization service").isEqualTo(1);
    }
}
