package com.swiftdrop.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.OrderStatusHistoryRepository;
import com.swiftdrop.order.support.ApplicationIntegrationTest;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end through the real Spring context, security filter chain and a real PostgreSQL schema
 * created by Flyway. Covers creation, persistence, idempotency and the ownership rule.
 */
class OrderCreationIntegrationTest extends ApplicationIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DeliveryOrderRepository orders;
    @Autowired private OrderStatusHistoryRepository history;

    private String body() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pickupAddress", "45 Galle Road, Colombo 03");
        body.put("pickupContactName", "Nuwan Pradeep");
        body.put("pickupContactPhone", "+94 77 123 4567");
        body.put("dropoffAddress", "12/4 Peradeniya Road, Kandy");
        body.put("dropoffContactName", "Ayesha Perera");
        body.put("dropoffContactPhone", "0718849201");
        body.put("parcelDescription", "Electronic accessories");
        body.put("parcelSize", "MEDIUM");
        body.put("weightKg", 1.5);
        // none of these may be honoured:
        body.put("customerId", 999);
        body.put("deliveryFee", 1);
        body.put("status", "DELIVERED");
        return objectMapper.writeValueAsString(body);
    }

    private MvcResult create(long customerId, String idempotencyKey) throws Exception {
        var request = post("/api/v1/orders")
                .header("Authorization", "Bearer " + TestTokens.customer(customerId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body());
        if (idempotencyKey != null) {
            request.header("Idempotency-Key", idempotencyKey);
        }
        return mvc.perform(request).andReturn();
    }

    @Test
    @DisplayName("creating an order persists it with a server-side fee, CREATED status and a history entry")
    void createPersistsOrder() throws Exception {
        MvcResult result = create(501, null);

        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        long id = json.get("id").asLong();

        assertThat(json.get("trackingNumber").asText()).matches("^SD-\\d{6}-[A-HJ-NP-Z2-9]{8}$");
        assertThat(json.get("status").asText()).isEqualTo("CREATED");
        assertThat(json.get("deliveryFee").decimalValue()).isEqualByComparingTo("725.00"); // 500 + 150 * 1.5
        assertThat(json.get("currency").asText()).isEqualTo("LKR");

        DeliveryOrder stored = orders.findById(id).orElseThrow();
        assertThat(stored.getCustomerId()).as("customer id comes from the token, not the body").isEqualTo(501L);
        assertThat(stored.getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(stored.getDeliveryFee()).as("client-supplied fee is ignored").isEqualByComparingTo("725.00");

        List<OrderStatusHistory> entries = history.findByOrderIdOrderByCreatedAtAsc(id);
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(entries.get(0).getChangedBy()).isEqualTo(501L);
    }

    @Test
    @DisplayName("each order gets a different tracking number")
    void trackingNumbersDiffer() throws Exception {
        String first = objectMapper.readTree(create(502, null).getResponse().getContentAsString()).get("trackingNumber").asText();
        String second = objectMapper.readTree(create(502, null).getResponse().getContentAsString()).get("trackingNumber").asText();

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    @DisplayName("repeating a request with the same Idempotency-Key creates only one order")
    void idempotentCreate() throws Exception {
        MvcResult first = create(503, "retry-key-1");
        MvcResult second = create(503, "retry-key-1");

        long firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asLong();
        long secondId = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asLong();

        assertThat(second.getResponse().getStatus()).isEqualTo(201);
        assertThat(secondId).isEqualTo(firstId);
        assertThat(orders.findAll().stream().filter(o -> o.getCustomerId() == 503L)).hasSize(1);
    }

    @Test
    @DisplayName("the same Idempotency-Key from different customers creates separate orders")
    void idempotencyKeyIsPerCustomer() throws Exception {
        long a = objectMapper.readTree(create(504, "shared-key").getResponse().getContentAsString()).get("id").asLong();
        long b = objectMapper.readTree(create(505, "shared-key").getResponse().getContentAsString()).get("id").asLong();

        assertThat(a).isNotEqualTo(b);
    }

    @Test
    @DisplayName("a customer cannot read another customer's order (404), but can read their own")
    void ownershipRule() throws Exception {
        long id = objectMapper.readTree(create(506, null).getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(get("/api/v1/orders/" + id).header("Authorization", "Bearer " + TestTokens.customer(506)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/orders/" + id).header("Authorization", "Bearer " + TestTokens.customer(507)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("listing returns only the caller's orders, newest first, with paging and a total count")
    void listsOwnOrdersWithPaging() throws Exception {
        long older = objectMapper.readTree(create(710, null).getResponse().getContentAsString()).get("id").asLong();
        long newer = objectMapper.readTree(create(710, null).getResponse().getContentAsString()).get("id").asLong();
        create(711, null); // another customer's order must never appear

        MvcResult all = mvc.perform(get("/api/v1/orders").header("Authorization", "Bearer " + TestTokens.customer(710)))
                .andExpect(status().isOk()).andReturn();
        JsonNode items = objectMapper.readTree(all.getResponse().getContentAsString());
        assertThat(all.getResponse().getHeader("X-Total-Count")).isEqualTo("2");
        assertThat(items).hasSize(2);
        assertThat(items.get(0).get("id").asLong()).as("newest first").isEqualTo(newer);
        assertThat(items.get(1).get("id").asLong()).isEqualTo(older);

        MvcResult secondPage = mvc.perform(get("/api/v1/orders?page=1&size=1")
                        .header("Authorization", "Bearer " + TestTokens.customer(710)))
                .andExpect(status().isOk()).andReturn();
        JsonNode pageItems = objectMapper.readTree(secondPage.getResponse().getContentAsString());
        assertThat(pageItems).hasSize(1);
        assertThat(pageItems.get(0).get("id").asLong()).isEqualTo(older);
        assertThat(secondPage.getResponse().getHeader("X-Total-Count")).isEqualTo("2");

        MvcResult none = mvc.perform(get("/api/v1/orders").header("Authorization", "Bearer " + TestTokens.customer(712)))
                .andExpect(status().isOk()).andReturn();
        assertThat(objectMapper.readTree(none.getResponse().getContentAsString())).isEmpty();
        assertThat(none.getResponse().getHeader("X-Total-Count")).isEqualTo("0");
    }

    @Test
    @DisplayName("an unauthenticated request cannot create or read orders")
    void requiresAuthentication() throws Exception {
        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/orders/1")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/orders")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("health endpoints stay open for the gateway and Docker health checks")
    void healthIsPublic() throws Exception {
        mvc.perform(get("/health")).andExpect(status().isOk());
    }
}
