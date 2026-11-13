package com.swiftdrop.order.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.dto.CreateOrderRequest;
import com.swiftdrop.order.dto.OrderResponse;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.pricing.PricingService;
import com.swiftdrop.order.security.CustomerIdResolver;
import com.swiftdrop.order.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Behaviour while authentication is switched off for the testing stage
 * ({@code swiftdrop.security.enabled=false}): no token needed, customer id comes from the
 * configuration or the X-Customer-Id header.
 */
@WebMvcTest(OrderController.class)
@Import({SecurityConfig.class, JacksonConfig.class, CustomerIdResolver.class, CityDirectory.class})
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=false",
        "swiftdrop.security.dev-customer-id=7"
})
class OrderControllerAuthDisabledTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private OrderService orderService;
    @MockBean private PricingService pricingService;

    private String body() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pickupAddress", "45 Galle Road, Colombo 03");
        body.put("pickupContactName", "Nuwan Pradeep");
        body.put("pickupContactPhone", "+94 77 123 4567");
        body.put("dropoffAddress", "12/4 Peradeniya Road, Kandy");
        body.put("dropoffContactName", "Ayesha Perera");
        body.put("dropoffContactPhone", "0718849201");
        body.put("parcelSize", "MEDIUM");
        body.put("weightKg", 1.8);
        body.put("pickupCity", "COLOMBO");
        body.put("dropoffCity", "KANDY");
        return objectMapper.writeValueAsString(body);
    }

    private static OrderResponse sampleResponse(long id) {
        return new OrderResponse(id, "SD-261113-AAAA2222", OrderStatus.CREATED, new BigDecimal("2400.00"), "LKR",
                "45 Galle Road, Colombo 03", "Nuwan Pradeep", "+94 77 123 4567",
                "12/4 Peradeniya Road, Kandy", "Ayesha Perera", "0718849201",
                null, ParcelSize.MEDIUM, new BigDecimal("1.80"), null,
                null, null, Instant.parse("2026-11-13T10:00:00Z"), Instant.parse("2026-11-13T10:00:00Z"),
                "COLOMBO", "KANDY", null);
    }

    @Test
    @DisplayName("an order can be created without any token, for the default test customer")
    void createsWithoutToken() throws Exception {
        when(orderService.createOrder(eq(7L), any(), isNull())).thenReturn(sampleResponse(1));

        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trackingNumber").value("SD-261113-AAAA2222"));

        verify(orderService).createOrder(eq(7L), any(CreateOrderRequest.class), isNull());
    }

    @Test
    @DisplayName("the X-Customer-Id header selects the customer, so ownership can still be tried by hand")
    void headerSelectsCustomer() throws Exception {
        when(orderService.createOrder(eq(55L), any(), isNull())).thenReturn(sampleResponse(2));
        when(orderService.getOrder(55L, 2L)).thenReturn(sampleResponse(2));

        mvc.perform(post("/orders").header("X-Customer-Id", "55")
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isCreated());
        mvc.perform(get("/orders/2").header("X-Customer-Id", "55")).andExpect(status().isOk());

        verify(orderService).createOrder(eq(55L), any(CreateOrderRequest.class), isNull());
        verify(orderService).getOrder(55L, 2L);
    }

    @Test
    @DisplayName("an order can be read without any token, as the default test customer")
    void readsWithoutToken() throws Exception {
        when(orderService.getOrder(7L, 3L)).thenReturn(sampleResponse(3));

        mvc.perform(get("/api/v1/orders/3")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("the order list works without a token, for the default customer or the X-Customer-Id header")
    void listsWithoutToken() throws Exception {
        when(orderService.listOrders(7L, 0, 20)).thenReturn(Page.empty());
        when(orderService.listOrders(55L, 0, 20))
                .thenReturn(new PageImpl<>(List.of(sampleResponse(9)), PageRequest.of(0, 20), 1));

        mvc.perform(get("/api/v1/orders")).andExpect(status().isOk());
        mvc.perform(get("/orders").header("X-Customer-Id", "55"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(9));
    }

    @Test
    @DisplayName("the quote and town list also work without a token while authentication is off")
    void quoteAndCitiesWithoutToken() throws Exception {
        mvc.perform(get("/api/v1/orders/cities")).andExpect(status().isOk());

        when(pricingService.quote(any(), any(), any(), any())).thenReturn(null);
        // a quote with an unsupported town is still validated (400) even without authentication
        mvc.perform(post("/api/v1/orders/quote").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pickupCity\":\"ATLANTIS\",\"dropoffCity\":\"KANDY\",\"parcelSize\":\"MEDIUM\",\"weightKg\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.pickupCity").exists());
    }

    @Test
    @DisplayName("a malformed X-Customer-Id is rejected with 400")
    void malformedHeaderIsRejected() throws Exception {
        mvc.perform(post("/api/v1/orders").header("X-Customer-Id", "abc")
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("validation still applies with auth disabled")
    void validationStillApplies() throws Exception {
        String invalid = body().replace("\"weightKg\":1.8", "\"weightKg\":0");

        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.weightKg").exists());
    }

    @Test
    @DisplayName("status can be changed without a token while auth is off; the change is recorded as a system change")
    void statusChangeWithoutToken() throws Exception {
        when(orderService.changeStatus(eq(5L), eq(OrderStatus.PICKED_UP), isNull(), isNull(), isNull()))
                .thenReturn(new com.swiftdrop.order.dto.StatusChangeResponse(5L, "SD-261113-AAAA2222",
                        OrderStatus.CREATED, OrderStatus.PICKED_UP, "Picked Up", Instant.parse("2026-11-13T09:00:00Z")));

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/orders/5/status")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PICKED_UP\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PICKED_UP"));
    }

    @Test
    @DisplayName("timeline and receipt use the default dev customer, or the X-Customer-Id header")
    void timelineAndReceiptUseDevCustomer() throws Exception {
        when(orderService.getTimeline(7L, 5L)).thenReturn(new com.swiftdrop.order.dto.TimelineResponse(
                5L, "SD-261113-AAAA2222", OrderStatus.CREATED, "Created", List.of()));
        when(orderService.getReceipt(3L, 5L)).thenThrow(new com.swiftdrop.order.exception.ResourceNotFoundException("Order not found"));

        mvc.perform(get("/api/v1/orders/5/timeline")).andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStatus").value("CREATED"));
        mvc.perform(get("/api/v1/orders/5/receipt").header("X-Customer-Id", "3")).andExpect(status().isNotFound());
        verify(orderService).getReceipt(3L, 5L);
    }
}
