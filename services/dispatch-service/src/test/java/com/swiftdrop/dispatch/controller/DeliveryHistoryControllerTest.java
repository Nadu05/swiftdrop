package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import com.swiftdrop.dispatch.exception.GlobalExceptionHandler;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.service.DeliveryHistoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DeliveryHistoryController.class)
@Import(GlobalExceptionHandler.class)
@AutoConfigureMockMvc(addFilters = false)
class DeliveryHistoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DeliveryHistoryService deliveryHistoryService;

    private DeliveryHistoryResponse sampleResponse() {
        return new DeliveryHistoryResponse(
                "ASN-HIST-001",
                "ORD-98399",
                "SD-94799",
                new DeliveryHistoryRecipientDto("Nimali Jayasuriya", "+94 71 889 4411", "45/2 Ward Place", "Colombo 07"),
                new DeliveryHistoryMerchantDto("Urban Fashion Boutique", "+94 11 234 5678"),
                new DeliveryHistoryCourierDto("1", "Kamal Silva", "CR-101", "WP BDF-8942", "+94 77 123 4567"),
                "DELIVERED",
                new ProofOfDeliveryDto("Nimali Jayasuriya", "Handed directly", "POD-SD-94799-SIG", null, ProofOfDeliveryType.SIGNATURE),
                null,
                "2026-11-10T10:45:00Z",
                1,
                "Residential drop-off",
                new DeliveryHistoryParcelDto("Apparel", "1.2 kg"),
                "HIGH",
                Collections.emptyList()
        );
    }

    @Test
    @DisplayName("GET /api/v1/dispatch/history returns 200 and envelope")
    void getDeliveryHistory_returnsEnvelope() throws Exception {
        DeliveryHistoryEnvelope envelope = new DeliveryHistoryEnvelope(
                List.of(sampleResponse()),
                new DeliveryHistorySummaryMetrics(1, 1, 0, 1)
        );

        when(deliveryHistoryService.getDeliveryHistoryEnvelope(any(), any(), any(), any(), any()))
                .thenReturn(envelope);

        mockMvc.perform(get("/api/v1/dispatch/history")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveries").isArray())
                .andExpect(jsonPath("$.deliveries[0].id").value("ASN-HIST-001"))
                .andExpect(jsonPath("$.deliveries[0].status").value("DELIVERED"))
                .andExpect(jsonPath("$.deliveries[0].pod.recipientName").value("Nimali Jayasuriya"))
                .andExpect(jsonPath("$.metrics.totalDeliveries").value(1))
                .andExpect(jsonPath("$.metrics.successfullyDelivered").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/dispatch/history/deliveries returns 200 and list")
    void getDeliveryRecords_returnsList() throws Exception {
        when(deliveryHistoryService.getDeliveryHistoryRecords(any(), any(), any(), any(), any()))
                .thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/api/v1/dispatch/history/deliveries")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value("ASN-HIST-001"));
    }

    @Test
    @DisplayName("GET /api/v1/dispatch/history/metrics returns 200 and metrics")
    void getMetrics_returnsMetrics() throws Exception {
        when(deliveryHistoryService.getDeliveryHistoryRecords(any(), any(), any(), any(), any()))
                .thenReturn(List.of(sampleResponse()));
        when(deliveryHistoryService.calculateMetrics(any()))
                .thenReturn(new DeliveryHistorySummaryMetrics(1, 1, 0, 1));

        mockMvc.perform(get("/api/v1/dispatch/history/metrics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDeliveries").value(1))
                .andExpect(jsonPath("$.successfullyDelivered").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/dispatch/history/{id} returns 200 and record details")
    void getById_returnsRecord() throws Exception {
        when(deliveryHistoryService.getDeliveryHistoryById("ASN-HIST-001"))
                .thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v1/dispatch/history/ASN-HIST-001")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ASN-HIST-001"))
                .andExpect(jsonPath("$.trackingNumber").value("SD-94799"));
    }

    @Test
    @DisplayName("GET /api/v1/dispatch/history/{id} not found returns 404")
    void getById_notFound() throws Exception {
        when(deliveryHistoryService.getDeliveryHistoryById("UNKNOWN-999"))
                .thenThrow(new ResourceNotFoundException("Delivery history record", "UNKNOWN-999"));

        mockMvc.perform(get("/api/v1/dispatch/history/UNKNOWN-999")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}

