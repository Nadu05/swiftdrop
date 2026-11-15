package com.swiftdrop.order.controller;

import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.dto.StatusChangeResponse;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.pricing.PricingService;
import com.swiftdrop.order.security.CustomerIdResolver;
import com.swiftdrop.order.service.DispatchQueryService;
import com.swiftdrop.order.service.OrderService;
import com.swiftdrop.order.service.TrackingService;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The API gateway routes {@code /api/v1/orders/**} with {@code StripPrefix=3}, which removes {@code api}, {@code v1}
 * AND {@code orders}: {@code POST /api/v1/orders} reaches this service as {@code POST /}, and
 * {@code GET /api/v1/orders/cities} as {@code GET /cities}. These tests send exactly those paths, with
 * authentication ON, and check both that they are routed and that each one keeps the SAME protection as its
 * {@code /api/v1/orders/...} twin (customers only, staff only for status, dispatch roles/key for the queue).
 */
@WebMvcTest({OrderController.class, DispatchOrderController.class, TrackingController.class})
@Import({SecurityConfig.class, JacksonConfig.class, CustomerIdResolver.class, CityDirectory.class})
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=true",
        "swiftdrop.security.jwt-secret=" + TestTokens.SECRET,
        "swiftdrop.security.service-api-key=" + TestTokens.SERVICE_KEY
})
class GatewayStrippedPathsTest {

    @Autowired private MockMvc mvc;
    @MockBean private OrderService orderService;
    @MockBean private PricingService pricingService;
    @MockBean private DispatchQueryService dispatchQuery;
    @MockBean private TrackingService trackingService;

    private static String customer() {
        return "Bearer " + TestTokens.customer(42);
    }

    private static String courier() {
        return "Bearer " + TestTokens.withRole(9, "COURIER");
    }

    // ------------------------------------------------------------------ customer endpoints

    @Test
    @DisplayName("GET /cities (gateway form of /api/v1/orders/cities): customers yes, couriers 403, anonymous 401")
    void cities() throws Exception {
        mvc.perform(get("/cities").header("Authorization", customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code=='COLOMBO')]").exists());
        mvc.perform(get("/cities").header("Authorization", courier())).andExpect(status().isForbidden());
        mvc.perform(get("/cities")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /quote is routed for customers (an empty body is a 400, not 404) and closed to others")
    void quote() throws Exception {
        mvc.perform(post("/quote").header("Authorization", customer())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/quote").header("Authorization", courier())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/quote").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST / (gateway form of POST /api/v1/orders) creates orders for customers only")
    void createOrder() throws Exception {
        mvc.perform(post("/").header("Authorization", customer())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/").header("Authorization", courier())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET / lists the caller's own orders; other roles are refused")
    void listOrders() throws Exception {
        when(orderService.listOrders(42L, 0, 20)).thenReturn(Page.empty());

        mvc.perform(get("/").header("Authorization", customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/").header("Authorization", courier())).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /{id}, /{id}/timeline and /{id}/receipt are routed for the owner and closed to other roles")
    void ownOrderEndpoints() throws Exception {
        when(orderService.getOrder(eq(42L), eq(7L))).thenThrow(new ResourceNotFoundException("Order not found"));
        when(orderService.getTimeline(eq(42L), eq(7L))).thenThrow(new ResourceNotFoundException("Order not found"));
        when(orderService.getReceipt(eq(42L), eq(7L))).thenThrow(new ResourceNotFoundException("Order not found"));

        for (String path : List.of("/7", "/7/timeline", "/7/receipt")) {
            // 404 from the service = the request reached the right controller method for this customer
            mvc.perform(get(path).header("Authorization", customer())).andExpect(status().isNotFound());
            mvc.perform(get(path).header("Authorization", courier())).andExpect(status().isForbidden());
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
    }

    // ------------------------------------------------------------------ staff endpoints

    @Test
    @DisplayName("PATCH /{id}/status: couriers can, customers cannot")
    void changeStatus() throws Exception {
        when(orderService.changeStatus(eq(7L), eq(OrderStatus.PICKED_UP), any(), any(), eq(9L)))
                .thenReturn(new StatusChangeResponse(7L, "SD-261113-AAAA2222", OrderStatus.CREATED,
                        OrderStatus.PICKED_UP, "Picked Up", Instant.parse("2026-11-13T09:00:00Z")));
        String body = "{\"status\":\"PICKED_UP\"}";

        mvc.perform(patch("/7/status").header("Authorization", courier())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        mvc.perform(patch("/7/status").header("Authorization", customer())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/7/status").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /ready-for-dispatch: dispatch staff and the Dispatch service key can read it; customers cannot")
    void readyForDispatch() throws Exception {
        when(dispatchQuery.readyForDispatch(any(), any())).thenReturn(List.of());

        mvc.perform(get("/ready-for-dispatch").header("Authorization",
                        "Bearer " + TestTokens.withRole(5, "DISPATCHER")))
                .andExpect(status().isOk());
        mvc.perform(get("/ready-for-dispatch").header("X-Service-Key", TestTokens.SERVICE_KEY))
                .andExpect(status().isOk());
        mvc.perform(get("/ready-for-dispatch").header("X-Service-Key", "wrong-key-wrong-key-wrong-key-123456"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/ready-for-dispatch").header("Authorization", customer()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/ready-for-dispatch")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("the service key opens ONLY the ready-for-dispatch queue, never the customer paths")
    void serviceKeyIsNarrow() throws Exception {
        mvc.perform(get("/cities").header("X-Service-Key", TestTokens.SERVICE_KEY))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/").header("X-Service-Key", TestTokens.SERVICE_KEY))
                .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ public tracking

    @Test
    @DisplayName("public tracking stays open without a token on the gateway form /tracking/{n}")
    void publicTracking() throws Exception {
        when(trackingService.track(any())).thenThrow(new ResourceNotFoundException("Tracking number not found"));

        // 404 (not 401): anonymous callers reach the controller
        mvc.perform(get("/tracking/SD-261113-AAAA2222")).andExpect(status().isNotFound());
    }
}
