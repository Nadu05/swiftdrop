package com.swiftdrop.order.controller;

import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.dto.ReceiptResponse;
import com.swiftdrop.order.dto.StatusChangeResponse;
import com.swiftdrop.order.dto.TimelineEntryResponse;
import com.swiftdrop.order.dto.TimelineResponse;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.pricing.FeeBreakdown;
import com.swiftdrop.order.pricing.PricingService;
import com.swiftdrop.order.security.CustomerIdResolver;
import com.swiftdrop.order.service.OrderService;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP behaviour of PATCH /{id}/status, GET /{id}/timeline and GET /{id}/receipt with authentication ON. */
@WebMvcTest(OrderController.class)
@Import({SecurityConfig.class, JacksonConfig.class, CustomerIdResolver.class, CityDirectory.class})
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=true",
        "swiftdrop.security.jwt-secret=" + TestTokens.SECRET
})
class OrderStatusEndpointsTest {

    private static final String BODY = "{\"status\":\"PICKED_UP\",\"note\":\"Collected\",\"location\":\"Colombo\"}";

    @Autowired private MockMvc mvc;
    @MockBean private OrderService orderService;
    @MockBean private PricingService pricingService;

    private static StatusChangeResponse changed() {
        return new StatusChangeResponse(7L, "SD-261113-AAAA2222", OrderStatus.CREATED, OrderStatus.PICKED_UP,
                "Picked Up", Instant.parse("2026-11-13T09:00:00Z"));
    }

    // ------------------------------------------------------------------ PATCH /{id}/status

    @ParameterizedTest
    @ValueSource(strings = {"COURIER", "BRANCH_ADMIN", "ADMIN", "courier"})
    @DisplayName("couriers and staff can change a status; the actor id is the token's user id")
    void staffCanChangeStatus(String role) throws Exception {
        when(orderService.changeStatus(eq(7L), eq(OrderStatus.PICKED_UP), eq("Collected"), eq("Colombo"), eq(9L)))
                .thenReturn(changed());

        mvc.perform(patch("/api/v1/orders/7/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, role))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.previousStatus").value("CREATED"))
                .andExpect(jsonPath("$.status").value("PICKED_UP"))
                .andExpect(jsonPath("$.statusLabel").value("Picked Up"))
                // a courier does not get the customer's addresses or phone numbers back
                .andExpect(jsonPath("$.pickupAddress").doesNotExist())
                .andExpect(jsonPath("$.dropoffContactPhone").doesNotExist());
    }

    @Test
    @DisplayName("also reachable at the gateway-stripped path /orders/{id}/status")
    void gatewayPath() throws Exception {
        when(orderService.changeStatus(eq(7L), any(), any(), any(), any())).thenReturn(changed());

        mvc.perform(patch("/orders/7/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a customer can never change a status (403)")
    void customerForbidden() throws Exception {
        mvc.perform(patch("/api/v1/orders/7/status")
                        .header("Authorization", "Bearer " + TestTokens.customer(42))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("no token is 401 and an unknown role is 403")
    void unauthenticatedAndUnknownRole() throws Exception {
        mvc.perform(patch("/api/v1/orders/7/status").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/orders/7/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, "MERCHANT"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("an invalid move is a 422 with the reason")
    void invalidMove() throws Exception {
        when(orderService.changeStatus(eq(7L), any(), any(), any(), any()))
                .thenThrow(new BusinessRuleException("Cannot change status from CREATED to DELIVERED"));

        mvc.perform(patch("/api/v1/orders/7/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DELIVERED\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Cannot change status from CREATED to DELIVERED"));
    }

    @Test
    @DisplayName("an unknown order is a 404")
    void unknownOrder() throws Exception {
        when(orderService.changeStatus(eq(99L), any(), any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Order not found"));

        mvc.perform(patch("/api/v1/orders/99/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"status\":null}", "{\"status\":\"TELEPORTED\"}", "{\"status\":\"picked_up\"}",
            "not json", ""})
    @DisplayName("a missing, unknown or malformed status is a 400")
    void invalidBody(String body) throws Exception {
        mvc.perform(patch("/api/v1/orders/7/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("an over-long note or location is a 400")
    void tooLongText() throws Exception {
        String body = "{\"status\":\"PICKED_UP\",\"note\":\"" + "n".repeat(1001) + "\",\"location\":\"" + "l".repeat(256) + "\"}";

        mvc.perform(patch("/api/v1/orders/7/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.note").exists())
                .andExpect(jsonPath("$.fieldErrors.location").exists());
    }

    @Test
    @DisplayName("a non-numeric order id is a 400")
    void nonNumericId() throws Exception {
        mvc.perform(patch("/api/v1/orders/abc/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a note without location is accepted and passed on as null")
    void optionalFields() throws Exception {
        when(orderService.changeStatus(eq(7L), eq(OrderStatus.FAILED), isNull(), isNull(), eq(9L))).thenReturn(changed());

        mvc.perform(patch("/api/v1/orders/7/status")
                        .header("Authorization", "Bearer " + TestTokens.withRole(9, "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"FAILED\"}"))
                .andExpect(status().isOk());
        verify(orderService).changeStatus(7L, OrderStatus.FAILED, null, null, 9L);
    }

    // ------------------------------------------------------------------ GET /{id}/timeline

    @Test
    @DisplayName("the owner reads the timeline, using the id from the token")
    void timeline() throws Exception {
        when(orderService.getTimeline(42L, 7L)).thenReturn(new TimelineResponse(7L, "SD-261113-AAAA2222",
                OrderStatus.PICKED_UP, "Picked Up", List.of(
                new TimelineEntryResponse(OrderStatus.CREATED, "Created", "Order created", null,
                        Instant.parse("2026-11-13T08:00:00Z")),
                new TimelineEntryResponse(OrderStatus.PICKED_UP, "Picked Up", "Collected", "Colombo",
                        Instant.parse("2026-11-13T09:00:00Z")))));

        mvc.perform(get("/api/v1/orders/7/timeline").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(7))
                .andExpect(jsonPath("$.currentStatus").value("PICKED_UP"))
                .andExpect(jsonPath("$.currentStatusLabel").value("Picked Up"))
                .andExpect(jsonPath("$.events.length()").value(2))
                .andExpect(jsonPath("$.events[0].status").value("CREATED"))
                .andExpect(jsonPath("$.events[1].location").value("Colombo"))
                .andExpect(jsonPath("$.events[1].timestamp").value("2026-11-13T09:00:00Z"))
                .andExpect(jsonPath("$.events[1].changedBy").doesNotExist());
    }

    @Test
    @DisplayName("someone else's timeline is a 404")
    void timelineNotOwned() throws Exception {
        when(orderService.getTimeline(42L, 8L)).thenThrow(new ResourceNotFoundException("Order not found"));

        mvc.perform(get("/api/v1/orders/8/timeline").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("the timeline needs a customer token: no token 401, courier 403")
    void timelineAuth() throws Exception {
        mvc.perform(get("/api/v1/orders/7/timeline")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/orders/7/timeline").header("Authorization", "Bearer " + TestTokens.withRole(9, "COURIER")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("an X-Customer-Id header cannot be used to read another customer's timeline when auth is on")
    void headerIgnored() throws Exception {
        when(orderService.getTimeline(42L, 7L)).thenThrow(new ResourceNotFoundException("Order not found"));

        mvc.perform(get("/api/v1/orders/7/timeline")
                        .header("Authorization", "Bearer " + TestTokens.customer(42))
                        .header("X-Customer-Id", "1"))
                .andExpect(status().isNotFound());
        verify(orderService).getTimeline(42L, 7L);
    }

    // ------------------------------------------------------------------ GET /{id}/receipt

    @Test
    @DisplayName("the owner reads the receipt with the stored fee breakdown")
    void receipt() throws Exception {
        FeeBreakdown fee = new FeeBreakdown(new BigDecimal("500.00"), new BigDecimal("50.00"),
                new BigDecimal("943.40"), new BigDecimal("200.00"), new BigDecimal("1693.40"), "LKR");
        when(orderService.getReceipt(42L, 7L)).thenReturn(new ReceiptResponse(7L, "SD-261113-AAAA2222",
                OrderStatus.DELIVERED, "Delivered", Instant.parse("2026-11-13T08:00:00Z"),
                Instant.parse("2026-11-14T12:00:00Z"), "COLOMBO", "45 Galle Road", "Nuwan",
                "KANDY", "12/4 Peradeniya Road", "Ayesha", "Electronics", ParcelSize.MEDIUM,
                new BigDecimal("1.50"), new BigDecimal("94.34"), fee, new BigDecimal("1693.40"), "LKR"));

        mvc.perform(get("/api/v1/orders/7/receipt").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trackingNumber").value("SD-261113-AAAA2222"))
                .andExpect(jsonPath("$.totalFee").value(1693.40))
                .andExpect(jsonPath("$.currency").value("LKR"))
                .andExpect(jsonPath("$.feeBreakdown.baseFee").value(500.00))
                .andExpect(jsonPath("$.feeBreakdown.weightFee").value(50.00))
                .andExpect(jsonPath("$.feeBreakdown.distanceFee").value(943.40))
                .andExpect(jsonPath("$.feeBreakdown.zoneSurcharge").value(200.00))
                .andExpect(jsonPath("$.deliveredAt").value("2026-11-14T12:00:00Z"))
                .andExpect(jsonPath("$.pickupCity").value("COLOMBO"))
                // phones and customer id are not part of a receipt
                .andExpect(jsonPath("$.pickupContactPhone").doesNotExist())
                .andExpect(jsonPath("$.customerId").doesNotExist());
    }

    @Test
    @DisplayName("someone else's receipt is a 404; no token is 401; a courier is 403")
    void receiptAuth() throws Exception {
        when(orderService.getReceipt(42L, 8L)).thenThrow(new ResourceNotFoundException("Order not found"));

        mvc.perform(get("/api/v1/orders/8/receipt").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/orders/8/receipt")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/orders/8/receipt").header("Authorization", "Bearer " + TestTokens.withRole(9, "ADMIN")))
                .andExpect(status().isForbidden());
    }
}
