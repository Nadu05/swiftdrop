package com.swiftdrop.order.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.dto.*;
import com.swiftdrop.order.exception.GlobalExceptionHandler;
import com.swiftdrop.order.exception.InvalidBranchCoverageException;
import com.swiftdrop.order.security.OrderJwtAuthenticationFilter;
import com.swiftdrop.order.security.OrderJwtService;
import com.swiftdrop.order.security.OrderUserPrincipal;
import com.swiftdrop.order.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@Import({
        SecurityConfig.class,
        OrderJwtAuthenticationFilter.class,
        OrderJwtService.class,
        GlobalExceptionHandler.class
})
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    private UsernamePasswordAuthenticationToken authToken(OrderUserPrincipal principal) {
        List<SimpleGrantedAuthority> authorities = principal.roles().stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                .toList();
        return new UsernamePasswordAuthenticationToken(principal, null, authorities);
    }

    @Test
    void generateQuote_PublicEndpoint_Returns200WithProvisionalQuote() throws Exception {
        OrderQuoteResponse quoteResp = new OrderQuoteResponse();
        quoteResp.setQuoteReference("QT-2026-8801");
        quoteResp.setEstimatedFee(new BigDecimal("1250.00"));
        quoteResp.setCurrency("LKR");
        quoteResp.setEstimatedDistanceKm(new BigDecimal("14.50"));
        quoteResp.setProvisionalPricing(true);

        when(orderService.generateQuote(any(OrderQuoteRequest.class))).thenReturn(quoteResp);

        String payload = """
                {
                  "pickupAddress": "120 Galle Road, Colombo 03",
                  "dropoffAddress": "45 Peradeniya Road, Kandy",
                  "parcelSize": "MEDIUM",
                  "weightKg": 2.5
                }
                """;

        mockMvc.perform(post("/api/v1/orders/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quoteReference").value("QT-2026-8801"))
                .andExpect(jsonPath("$.estimatedFee").value(1250.00))
                .andExpect(jsonPath("$.provisionalPricing").value(true));
    }

    @Test
    void generateQuote_WhenLocationOutsideServiceArea_Returns422UnprocessableEntity() throws Exception {
        when(orderService.generateQuote(any(OrderQuoteRequest.class)))
                .thenThrow(new InvalidBranchCoverageException(
                        "Destination location is outside active branch coverage",
                        "DESTINATION"
                ));

        String payload = """
                {
                  "pickupAddress": "120 Galle Road, Colombo 03",
                  "dropoffAddress": "Unsupported Remote Island",
                  "parcelSize": "SMALL",
                  "weightKg": 1.0
                }
                """;

        mockMvc.perform(post("/api/v1/orders/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.locationType").value("DESTINATION"))
                .andExpect(jsonPath("$.message").value("Destination location is outside active branch coverage"));
    }

    @Test
    void getPublicTracking_PublicEndpoint_ReturnsSafeTrackingTimelineWithoutAuthentication() throws Exception {
        PublicTrackingResponse trackingResp = new PublicTrackingResponse();
        trackingResp.setTrackingNumber("SD-88421");
        trackingResp.setStatus("IN_TRANSIT");
        trackingResp.setStatusLabel("In Transit");
        trackingResp.setOrigin("Colombo");
        trackingResp.setDestination("Kandy");
        trackingResp.setBranch("Colombo Central Hub");
        trackingResp.setDestinationBranch("Kandy Regional Hub");

        when(orderService.getPublicTracking("SD-88421")).thenReturn(trackingResp);

        mockMvc.perform(get("/api/v1/orders/tracking/SD-88421"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trackingNumber").value("SD-88421"))
                .andExpect(jsonPath("$.status").value("IN_TRANSIT"))
                .andExpect(jsonPath("$.statusLabel").value("In Transit"))
                .andExpect(jsonPath("$.origin").value("Colombo"))
                .andExpect(jsonPath("$.destination").value("Kandy"));
    }

    @Test
    void createOrder_WithoutAuthentication_Returns401Unauthorized() throws Exception {
        String payload = """
                {
                  "pickupContactName": "Kasun Silva",
                  "pickupContactPhone": "+94 77 111 2222",
                  "pickupAddress": "120 Galle Road, Colombo 03",
                  "dropoffContactName": "Nimal Perera",
                  "dropoffContactPhone": "+94 77 333 4444",
                  "dropoffAddress": "45 Peradeniya Road, Kandy",
                  "parcelDescription": "Documents",
                  "parcelSize": "SMALL",
                  "weightKg": 1.0
                }
                """;

        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void createOrder_WithAuthenticatedCustomer_Returns201Created() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );

        DeliveryOrderResponse createdResp = new DeliveryOrderResponse();
        createdResp.setId(101L);
        createdResp.setTrackingNumber("SD-91005");
        createdResp.setStatus("CONFIRMED");
        createdResp.setStatusLabel("Confirmed");
        createdResp.setPaymentMethod("COD");
        createdResp.setPaymentStatus("COD_PENDING_COLLECTION");
        createdResp.setDeliveryFee(new BigDecimal("1450.00"));
        createdResp.setCodAmount(new BigDecimal("5000.00"));

        when(orderService.createOrder(any(CreateOrderRequest.class), eq(customer))).thenReturn(createdResp);

        String payload = """
                {
                  "pickupContactName": "Kasun Silva",
                  "pickupContactPhone": "+94 77 111 2222",
                  "pickupAddress": "120 Galle Road, Colombo 03",
                  "dropoffContactName": "Nimal Perera",
                  "dropoffContactPhone": "+94 77 333 4444",
                  "dropoffAddress": "45 Peradeniya Road, Kandy",
                  "parcelDescription": "Documents",
                  "parcelSize": "SMALL",
                  "weightKg": 1.0,
                  "paymentMethod": "COD",
                  "codAmount": 5000.00
                }
                """;

        mockMvc.perform(post("/api/v1/orders")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trackingNumber").value("SD-91005"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.deliveryFee").value(1450.00))
                .andExpect(jsonPath("$.codAmount").value(5000.00));
    }
}
