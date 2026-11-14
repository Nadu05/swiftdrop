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

    private Map<String, Object> baseBody() {
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
        body.put("pickupCity", "COLOMBO");
        body.put("dropoffCity", "KANDY");
        // none of these may be honoured:
        body.put("customerId", 999);
        body.put("deliveryFee", 1);
        body.put("status", "DELIVERED");
        return body;
    }

    private String body() throws Exception {
        return objectMapper.writeValueAsString(baseBody());
    }

    private MvcResult send(String path, long customerId, Map<String, Object> body) throws Exception {
        return mvc.perform(post(path)
                .header("Authorization", "Bearer " + TestTokens.customer(customerId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))).andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
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
        // Colombo -> Kandy, 1.5 kg: 500 base + 0.5 kg x 100 + 94.34 km x 10 + 200 zone surcharge
        assertThat(json.get("deliveryFee").decimalValue()).isEqualByComparingTo("1693.40");
        assertThat(json.get("currency").asText()).isEqualTo("LKR");
        assertThat(json.get("feeBreakdown").get("baseFee").decimalValue()).isEqualByComparingTo("500.00");
        assertThat(json.get("feeBreakdown").get("weightFee").decimalValue()).isEqualByComparingTo("50.00");
        assertThat(json.get("feeBreakdown").get("distanceFee").decimalValue()).isEqualByComparingTo("943.40");
        assertThat(json.get("feeBreakdown").get("zoneSurcharge").decimalValue()).isEqualByComparingTo("200.00");
        assertThat(json.get("distanceKm").decimalValue()).isEqualByComparingTo("94.34");
        assertThat(json.get("pickupCity").asText()).isEqualTo("COLOMBO");
        assertThat(json.get("dropoffCity").asText()).isEqualTo("KANDY");

        DeliveryOrder stored = orders.findById(id).orElseThrow();
        assertThat(stored.getCustomerId()).as("customer id comes from the token, not the body").isEqualTo(501L);
        assertThat(stored.getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(stored.getDeliveryFee()).as("client-supplied fee is ignored").isEqualByComparingTo("1693.40");
        assertThat(stored.getPickupCity()).isEqualTo("COLOMBO");
        assertThat(stored.getDropoffCity()).isEqualTo("KANDY");
        assertThat(stored.getDistanceKm()).isEqualByComparingTo("94.34");
        assertThat(stored.getBaseFee().add(stored.getWeightFee()).add(stored.getDistanceFee()).add(stored.getZoneSurcharge()))
                .as("stored parts add up to the stored fee").isEqualByComparingTo(stored.getDeliveryFee());

        List<OrderStatusHistory> entries = history.findByOrderIdOrderByCreatedAtAsc(id);
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(entries.get(0).getChangedBy()).isEqualTo(501L);
    }

    @Test
    @DisplayName("the fee in the quote is exactly the fee charged when the order is created")
    void quoteMatchesChargedFee() throws Exception {
        Map<String, Object> quoteBody = new LinkedHashMap<>();
        quoteBody.put("pickupCity", "COLOMBO");
        quoteBody.put("dropoffCity", "KANDY");
        quoteBody.put("parcelSize", "MEDIUM");
        quoteBody.put("weightKg", 1.5);

        MvcResult quoteResult = send("/api/v1/orders/quote", 520, quoteBody);
        assertThat(quoteResult.getResponse().getStatus()).isEqualTo(200);
        JsonNode quote = json(quoteResult);
        assertThat(quote.get("estimatedFee").decimalValue()).isEqualByComparingTo("1693.40");
        assertThat(quote.get("estimatedDistanceKm").decimalValue()).isEqualByComparingTo("94.34");
        assertThat(quote.get("breakdown").get("totalFee").decimalValue()).isEqualByComparingTo("1693.40");

        Map<String, Object> orderBody = baseBody();
        orderBody.put("expectedFee", quote.get("estimatedFee").decimalValue()); // the customer confirms what they saw
        MvcResult created = send("/api/v1/orders", 520, orderBody);

        assertThat(created.getResponse().getStatus()).isEqualTo(201);
        assertThat(json(created).get("deliveryFee").decimalValue())
                .isEqualByComparingTo(quote.get("estimatedFee").decimalValue());
    }

    @Test
    @DisplayName("quoting does not create an order")
    void quoteStoresNothing() throws Exception {
        long before = orders.count();
        Map<String, Object> quoteBody = new LinkedHashMap<>();
        quoteBody.put("pickupCity", "GALLE");
        quoteBody.put("dropoffCity", "JAFFNA");
        quoteBody.put("parcelSize", "LARGE");
        quoteBody.put("weightKg", 12.5);

        assertThat(send("/api/v1/orders/quote", 521, quoteBody).getResponse().getStatus()).isEqualTo(200);

        assertThat(orders.count()).isEqualTo(before);
    }

    @Test
    @DisplayName("a stale expectedFee is refused with 409 and nothing is stored")
    void staleExpectedFeeIsRefused() throws Exception {
        Map<String, Object> orderBody = baseBody();
        orderBody.put("expectedFee", 1500.00); // the real fee is 1693.40

        MvcResult result = send("/api/v1/orders", 522, orderBody);

        assertThat(result.getResponse().getStatus()).isEqualTo(409);
        assertThat(orders.findAll().stream().filter(o -> o.getCustomerId() == 522L)).isEmpty();
    }

    @Test
    @DisplayName("deliveries within one district pay no zone surcharge; the same town pays no distance fee")
    void zoneAndDistanceRules() throws Exception {
        Map<String, Object> sameTown = baseBody();
        sameTown.put("dropoffCity", "COLOMBO");
        Map<String, Object> sameDistrict = baseBody();
        sameDistrict.put("dropoffCity", "DEHIWALA"); // both in Colombo district, 8.38 km apart

        JsonNode town = json(send("/api/v1/orders", 523, sameTown));
        JsonNode district = json(send("/api/v1/orders", 523, sameDistrict));

        assertThat(town.get("deliveryFee").decimalValue()).isEqualByComparingTo("550.00");       // 500 + 0.5 x 100
        assertThat(town.get("feeBreakdown").get("distanceFee").decimalValue()).isEqualByComparingTo("0.00");
        assertThat(district.get("deliveryFee").decimalValue()).isEqualByComparingTo("633.80");   // 550 + 8.38 x 10
        assertThat(district.get("feeBreakdown").get("zoneSurcharge").decimalValue()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("a parcel too heavy for its size is refused (422) for both the quote and the order, creating nothing")
    void weightMustSuitTheSize() throws Exception {
        Map<String, Object> heavySmall = baseBody();
        heavySmall.put("parcelSize", "SMALL");
        heavySmall.put("weightKg", 2.01); // SMALL parcels may weigh at most 2 kg

        MvcResult order = send("/api/v1/orders", 524, heavySmall);
        MvcResult quote = send("/api/v1/orders/quote", 524, heavySmall);

        assertThat(order.getResponse().getStatus()).isEqualTo(422);
        assertThat(json(order).get("message").asText()).contains("SMALL");
        assertThat(quote.getResponse().getStatus()).isEqualTo(422);
        assertThat(orders.findAll().stream().filter(o -> o.getCustomerId() == 524L)).isEmpty();
    }

    @Test
    @DisplayName("an unsupported town is rejected with 400 and a field error")
    void unsupportedTown() throws Exception {
        Map<String, Object> body = baseBody();
        body.put("dropoffCity", "ATLANTIS");

        MvcResult result = send("/api/v1/orders", 525, body);

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(json(result).get("fieldErrors").has("dropoffCity")).isTrue();
    }

    @Test
    @DisplayName("the town list is served to authenticated customers")
    void townList() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/orders/cities")
                .header("Authorization", "Bearer " + TestTokens.customer(526))).andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(json(result).size()).isGreaterThanOrEqualTo(25);
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
