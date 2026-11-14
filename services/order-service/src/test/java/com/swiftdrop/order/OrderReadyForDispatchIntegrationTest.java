package com.swiftdrop.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.support.ApplicationIntegrationTest;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** GET /orders/ready-for-dispatch against a real database and the real security chain. */
class OrderReadyForDispatchIntegrationTest extends ApplicationIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DeliveryOrderRepository orders;

    private long createOrderInBranch(long customerId, long branchId, String dropoffCity) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pickupAddress", "45 Galle Road, Colombo 03");
        body.put("pickupContactName", "Nuwan Pradeep");
        body.put("pickupContactPhone", "+94 77 123 4567");
        body.put("dropoffAddress", "12/4 Peradeniya Road, Kandy");
        body.put("dropoffContactName", "Ayesha Perera");
        body.put("dropoffContactPhone", "0718849201");
        body.put("deliveryInstructions", "Call on arrival");
        body.put("parcelSize", "SMALL");
        body.put("weightKg", 0.5);
        body.put("pickupCity", "COLOMBO");
        body.put("dropoffCity", dropoffCity);
        MvcResult created = mvc.perform(post("/api/v1/orders")
                .header("Authorization", "Bearer " + TestTokens.customer(customerId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))).andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        // Branch resolution is not implemented yet, so the branch is set directly for this test.
        DeliveryOrder order = orders.findById(id).orElseThrow();
        order.setBranchId(branchId);
        orders.saveAndFlush(order);
        return id;
    }

    private JsonNode ready(String query, String role) throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/orders/ready-for-dispatch" + query)
                .header("Authorization", "Bearer " + TestTokens.withRole(5, role))).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private static List<Long> ids(JsonNode array) {
        List<Long> ids = new ArrayList<>();
        array.forEach(n -> ids.add(n.get("id").asLong()));
        return ids;
    }

    @Test
    @DisplayName("lists CREATED orders of the branch, oldest first, with the recipient details Dispatch needs")
    void listsReadyOrders() throws Exception {
        long branch = 880_001L;
        long first = createOrderInBranch(801, branch, "KANDY");
        long second = createOrderInBranch(802, branch, "GALLE");
        long third = createOrderInBranch(803, branch, "JAFFNA");
        createOrderInBranch(804, 880_002L, "KANDY"); // another branch

        JsonNode result = ready("?branchId=" + branch, "DISPATCHER");

        assertThat(ids(result)).containsExactly(first, second, third);
        JsonNode one = result.get(0);
        assertThat(one.get("recipientName").asText()).isEqualTo("Ayesha Perera");
        assertThat(one.get("recipientPhone").asText()).isEqualTo("0718849201");
        assertThat(one.get("deliveryAddress").asText()).isEqualTo("12/4 Peradeniya Road, Kandy");
        assertThat(one.get("city").asText()).isEqualTo("Kandy");
        assertThat(result.get(1).get("city").asText()).isEqualTo("Galle");
        assertThat(one.get("merchantName").asText()).isEqualTo("Nuwan Pradeep");
        assertThat(one.get("packageType").asText()).isEqualTo("SMALL");
        assertThat(one.get("weightKg").asDouble()).isEqualTo(0.5);
        assertThat(one.get("handlingNotes").asText()).isEqualTo("Call on arrival");
        assertThat(one.get("priority").asText()).isEqualTo("STANDARD");
        assertThat(one.get("branchId").asLong()).isEqualTo(branch);
        assertThat(one.get("trackingNumber").asText()).matches("^SD-\\d{6}-[A-HJ-NP-Z2-9]{8}$");
        assertThat(one.get("createdAt").asText()).as("a zone-less local date-time")
                .matches("^\\d{4}-\\d{2}-\\d{2}T[\\d:.]+$");
    }

    @Test
    @DisplayName("the limit is applied to the oldest orders, and an unknown branch gives an empty list")
    void limitAndUnknownBranch() throws Exception {
        long branch = 880_010L;
        long first = createOrderInBranch(811, branch, "KANDY");
        long second = createOrderInBranch(812, branch, "KANDY");
        createOrderInBranch(813, branch, "KANDY");

        assertThat(ids(ready("?branchId=" + branch + "&limit=2", "ADMIN"))).containsExactly(first, second);
        assertThat(ready("?branchId=880099", "ADMIN")).isEmpty();
    }

    @Test
    @DisplayName("an order leaves the list as soon as it is picked up")
    void pickedUpOrderLeavesTheList() throws Exception {
        long branch = 880_020L;
        long stays = createOrderInBranch(821, branch, "KANDY");
        long leaves = createOrderInBranch(822, branch, "KANDY");
        assertThat(ids(ready("?branchId=" + branch, "BRANCH_ADMIN"))).containsExactly(stays, leaves);

        MvcResult change = mvc.perform(patch("/api/v1/orders/" + leaves + "/status")
                .header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PICKED_UP\"}")).andReturn();
        assertThat(change.getResponse().getStatus()).isEqualTo(200);

        assertThat(ids(ready("?branchId=" + branch, "DISPATCHER"))).containsExactly(stays);
    }

    @Test
    @DisplayName("customers, couriers and anonymous callers cannot read recipient details")
    void refused() throws Exception {
        assertThat(mvc.perform(get("/api/v1/orders/ready-for-dispatch")
                .header("Authorization", "Bearer " + TestTokens.customer(830))).andReturn().getResponse().getStatus())
                .isEqualTo(403);
        assertThat(mvc.perform(get("/api/v1/orders/ready-for-dispatch")).andReturn().getResponse().getStatus())
                .isEqualTo(401);
        assertThat(mvc.perform(get("/api/v1/orders/ready-for-dispatch")
                .header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER"))).andReturn().getResponse().getStatus())
                .isEqualTo(403);
    }

    @Test
    @DisplayName("the literal path is not mistaken for an order id")
    void notTreatedAsOrderId() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/orders/ready-for-dispatch")
                .header("Authorization", "Bearer " + TestTokens.withRole(5, "ADMIN"))).andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(objectMapper.readTree(result.getResponse().getContentAsString()).isArray()).isTrue();
    }

    // ------------------------------------------------------------------ Dispatch service key

    @Test
    @DisplayName("the Dispatch service reads the list with its key and gets the pickup address too")
    void serviceKeyReadsList() throws Exception {
        long branch = 880_030L;
        long id = createOrderInBranch(831, branch, "KANDY");

        for (String path : List.of("/api/v1/orders/ready-for-dispatch", "/orders/ready-for-dispatch")) {
            MvcResult result = mvc.perform(get(path + "?branchId=" + branch)
                    .header("X-Service-Key", TestTokens.SERVICE_KEY)).andReturn();
            assertThat(result.getResponse().getStatus()).as(path).isEqualTo(200);
            JsonNode list = objectMapper.readTree(result.getResponse().getContentAsString());
            assertThat(ids(list)).containsExactly(id);
            assertThat(list.get(0).get("pickupAddress").asText()).isEqualTo("45 Galle Road, Colombo 03");
            assertThat(list.get(0).get("pickupCity").asText()).isEqualTo("Colombo");
        }
    }

    @Test
    @DisplayName("a wrong service key is 401")
    void wrongServiceKey() throws Exception {
        for (String key : List.of("wrong", TestTokens.SERVICE_KEY + "x", TestTokens.SERVICE_KEY.toUpperCase())) {
            assertThat(mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("X-Service-Key", key))
                    .andReturn().getResponse().getStatus()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("the service key opens nothing else: not customer orders, not status changes, not tracking writes")
    void serviceKeyIsNarrow() throws Exception {
        long id = createOrderInBranch(832, 880_031L, "KANDY");
        String key = TestTokens.SERVICE_KEY;

        assertThat(mvc.perform(get("/api/v1/orders/" + id).header("X-Service-Key", key))
                .andReturn().getResponse().getStatus()).as("read an order").isEqualTo(401);
        assertThat(mvc.perform(get("/api/v1/orders").header("X-Service-Key", key))
                .andReturn().getResponse().getStatus()).as("list orders").isEqualTo(401);
        assertThat(mvc.perform(get("/api/v1/orders/" + id + "/timeline").header("X-Service-Key", key))
                .andReturn().getResponse().getStatus()).as("timeline").isEqualTo(401);
        assertThat(mvc.perform(get("/api/v1/orders/" + id + "/receipt").header("X-Service-Key", key))
                .andReturn().getResponse().getStatus()).as("receipt").isEqualTo(401);
        assertThat(mvc.perform(patch("/api/v1/orders/" + id + "/status").header("X-Service-Key", key)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PICKED_UP\"}"))
                .andReturn().getResponse().getStatus()).as("change a status").isEqualTo(401);
        assertThat(mvc.perform(post("/api/v1/orders/ready-for-dispatch").header("X-Service-Key", key))
                .andReturn().getResponse().getStatus()).as("POST on the same path").isEqualTo(401);

        assertThat(orders.findById(id).orElseThrow().getStatus().name()).isEqualTo("CREATED");
    }

    @Test
    @DisplayName("a customer token is still refused even when the service key header is also sent")
    void keyDoesNotElevateACustomer() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/orders/ready-for-dispatch")
                .header("Authorization", "Bearer " + TestTokens.customer(833))
                .header("X-Service-Key", "wrong-key-wrong-key-wrong-key-wrong-1")).andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(403);
    }
}
