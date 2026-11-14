package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.ParcelInfoDto;
import com.swiftdrop.dispatch.dto.UnassignedDeliveryResponse;
import com.swiftdrop.dispatch.exception.GlobalExceptionHandler;
import com.swiftdrop.dispatch.exception.ServiceUnavailableException;
import com.swiftdrop.dispatch.service.UnassignedDeliveryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DispatchDeliveryController.class)
@Import(GlobalExceptionHandler.class)
@ActiveProfiles("test")
class DispatchDeliveryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UnassignedDeliveryService unassignedDeliveryService;

    @Test
    @DisplayName("Should return HTTP 200 with unassigned deliveries at /api/v1/dispatch/unassigned")
    void shouldReturnUnassignedDeliveries() throws Exception {
        UnassignedDeliveryResponse delivery = new UnassignedDeliveryResponse(
                101L, "ORD-98421", "TRK-00101", "Tharindu Perera", "+94 77 123 5678",
                "45/2 Dutugemunu St", "Colombo", "Apex Electronics LK", "+94 11 234 8899",
                LocalDateTime.now(), "URGENT",
                new ParcelInfoDto(2.4, "Electronics", "30x20x15 cm", "Fragile")
        );

        when(unassignedDeliveryService.getUnassignedDeliveries(null, 50))
                .thenReturn(List.of(delivery));

        mockMvc.perform(get("/api/v1/dispatch/unassigned")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].orderId", is(101)))
                .andExpect(jsonPath("$[0].orderNumber", is("ORD-98421")))
                .andExpect(jsonPath("$[0].parcelInfo.weightKg", is(2.4)));
    }

    @Test
    @DisplayName("Should support gateway forwarded dual-mapping at /unassigned")
    void shouldSupportDualMappingAtUnassigned() throws Exception {
        when(unassignedDeliveryService.getUnassignedDeliveries(10L, 25))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/unassigned")
                        .param("branchId", "10")
                        .param("limit", "25")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Should return HTTP 503 when Order Service is unavailable")
    void shouldReturn503WhenOrderServiceUnavailable() throws Exception {
        when(unassignedDeliveryService.getUnassignedDeliveries(null, 50))
                .thenThrow(new ServiceUnavailableException("Order Service is unreachable"));

        mockMvc.perform(get("/api/v1/dispatch/unassigned")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status", is(503)))
                .andExpect(jsonPath("$.error", is("Service Unavailable")))
                .andExpect(jsonPath("$.message", is("Order Service is unreachable")));
    }

    @Test
    @DisplayName("Should return HTTP 400 when invalid query parameters are supplied")
    void shouldReturn400WhenInvalidLimit() throws Exception {
        when(unassignedDeliveryService.getUnassignedDeliveries(null, -5))
                .thenThrow(new IllegalArgumentException("Limit must be greater than zero"));

        mockMvc.perform(get("/api/v1/dispatch/unassigned")
                        .param("limit", "-5")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }
}

