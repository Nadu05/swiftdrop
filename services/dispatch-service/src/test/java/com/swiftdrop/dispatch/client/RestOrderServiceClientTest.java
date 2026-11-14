package com.swiftdrop.dispatch.client;

import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.security.DispatchJwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class RestOrderServiceClientTest {

    private MockRestServiceServer mockServer;
    private RestOrderServiceClient orderClient;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8083");
        mockServer = MockRestServiceServer.bindTo(builder).build();
        DispatchJwtService jwtService = new DispatchJwtService(
                "swiftdrop-super-secret-jwt-key-must-be-at-least-32-bytes-long-2026"
        );
        orderClient = new RestOrderServiceClient(builder.build(), jwtService);
    }

    @Test
    void getOrderByIdOrTracking_ReturnsParsedOrderSummary() {
        String responseJson = """
                {
                  "id": 101,
                  "trackingNumber": "SD-54321",
                  "status": "CONFIRMED",
                  "pickupMethod": "COURIER_PICKUP",
                  "originBranchId": 1,
                  "originBranchCode": "CMB-CENTRAL",
                  "originBranchName": "Colombo Central Hub",
                  "destinationBranchId": 2,
                  "destinationBranchCode": "KDY-MAIN",
                  "destinationBranchName": "Kandy Regional Hub",
                  "sameBranch": false,
                  "pickupAddress": "10 Duplication Rd, Colombo 03",
                  "pickupContactName": "Nimal Perera",
                  "pickupContactPhone": "+94771112233",
                  "dropoffAddress": "25 Peradeniya Rd, Kandy",
                  "dropoffContactName": "Sunil Bandara",
                  "dropoffContactPhone": "+94712223344",
                  "parcelDescription": "Electronics",
                  "parcelSize": "MEDIUM",
                  "weightKg": 2.50,
                  "distanceKm": 95.40,
                  "deliveryFee": 1850.00
                }
                """;

        mockServer.expect(requestTo("http://localhost:8083/api/v1/orders/SD-54321"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        OrderSummaryDto summary = orderClient.getOrderByIdOrTracking("SD-54321");

        assertNotNull(summary);
        assertEquals("101", summary.resolvedOrderId());
        assertEquals("SD-54321", summary.getTrackingNumber());
        assertEquals("COURIER_PICKUP", summary.getPickupMethod());
        assertEquals(1L, summary.getOriginBranchId());
        assertEquals(2L, summary.getDestinationBranchId());
        mockServer.verify();
    }

    @Test
    void getOrderByIdOrTracking_NotFound_ThrowsResourceNotFoundException() {
        mockServer.expect(requestTo("http://localhost:8083/api/v1/orders/SD-99999"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThrows(
                ResourceNotFoundException.class,
                () -> orderClient.getOrderByIdOrTracking("SD-99999")
        );
        mockServer.verify();
    }

    @Test
    void notifyStatusTransition_SendsPatchToOrderService() {
        mockServer.expect(requestTo("http://localhost:8083/api/v1/orders/101/status"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.recipientConfirmedName").value("Sunil Bandara"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        OrderStatusTransitionPayload payload = new OrderStatusTransitionPayload(
                "DELIVERED",
                "25 Peradeniya Rd, Kandy",
                "Delivered to recipient"
        );
        payload.setRecipientConfirmedName("Sunil Bandara");
        payload.setSignatureReference("pod-storage://sig/SD-54321/sig-1");

        orderClient.notifyStatusTransition("101", payload, "courier-101", "COURIER");
        mockServer.verify();
    }
}
