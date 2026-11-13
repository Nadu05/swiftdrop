package com.swiftdrop.organization.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.dto.ServiceAreaCreateRequest;
import com.swiftdrop.organization.dto.ServiceAreaResponse;
import com.swiftdrop.organization.dto.ServiceAreaUpdateRequest;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import com.swiftdrop.organization.exception.GlobalExceptionHandler;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.service.ServiceAreaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ServiceAreaController.class)
@Import(GlobalExceptionHandler.class)
class ServiceAreaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ServiceAreaService serviceAreaService;

    private ServiceAreaResponse sampleResponse() {
        return new ServiceAreaResponse(
                10L,
                1L,
                "BR-COL-001",
                "Colombo Branch",
                "Colombo Central",
                6.9200,
                79.8600,
                new BigDecimal("15.00"),
                "ACTIVE",
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("POST /service-areas should return 201 Created on valid input")
    void shouldReturn201OnValidCreate() throws Exception {
        ServiceAreaCreateRequest request = new ServiceAreaCreateRequest(
                1L,
                "Colombo Central",
                6.9200,
                79.8600,
                new BigDecimal("15.00")
        );

        when(serviceAreaService.create(any(ServiceAreaCreateRequest.class))).thenReturn(sampleResponse());

        mockMvc.perform(post("/service-areas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10L))
                .andExpect(jsonPath("$.areaName").value("Colombo Central"))
                .andExpect(jsonPath("$.branchCode").value("BR-COL-001"));
    }

    @Test
    @DisplayName("POST /api/v1/service-areas should also work via dual mapping")
    void shouldSupportDirectRouteOnPost() throws Exception {
        ServiceAreaCreateRequest request = new ServiceAreaCreateRequest(
                1L,
                "Colombo Central",
                6.9200,
                79.8600,
                new BigDecimal("15.00")
        );

        when(serviceAreaService.create(any(ServiceAreaCreateRequest.class))).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/service-areas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10L));
    }

    @Test
    @DisplayName("POST /service-areas should return 400 Bad Request when required fields are missing")
    void shouldReturn400WhenRequiredFieldsMissing() throws Exception {
        ServiceAreaCreateRequest emptyRequest = new ServiceAreaCreateRequest();

        mockMvc.perform(post("/service-areas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.branchId").exists())
                .andExpect(jsonPath("$.fieldErrors.areaName").exists())
                .andExpect(jsonPath("$.fieldErrors.centerLatitude").exists())
                .andExpect(jsonPath("$.fieldErrors.centerLongitude").exists())
                .andExpect(jsonPath("$.fieldErrors.maxRadiusKm").exists());
    }

    @Test
    @DisplayName("POST /service-areas should return 400 Bad Request when radius is zero or negative")
    void shouldReturn400WhenRadiusIsNonPositive() throws Exception {
        ServiceAreaCreateRequest request = new ServiceAreaCreateRequest(
                1L,
                "Invalid Area",
                6.9200,
                79.8600,
                new BigDecimal("0.00") // Must be > 0
        );

        mockMvc.perform(post("/service-areas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.maxRadiusKm").exists());
    }

    @Test
    @DisplayName("GET /service-areas should return 200 OK with list")
    void shouldReturnAllServiceAreas() throws Exception {
        when(serviceAreaService.findAll(null)).thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/service-areas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10L))
                .andExpect(jsonPath("$[0].areaName").value("Colombo Central"));
    }

    @Test
    @DisplayName("GET /service-areas?status=ACTIVE should return 200 OK with filtered list")
    void shouldReturnFilteredServiceAreas() throws Exception {
        when(serviceAreaService.findAll(ServiceAreaStatus.ACTIVE)).thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/service-areas").param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));
    }

    @Test
    @DisplayName("GET /service-areas/{id} should return 200 OK when found")
    void shouldReturnById() throws Exception {
        when(serviceAreaService.findById(10L)).thenReturn(sampleResponse());

        mockMvc.perform(get("/service-areas/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10L));
    }

    @Test
    @DisplayName("GET /service-areas/{id} should return 404 Not Found when not found")
    void shouldReturn404WhenNotFound() throws Exception {
        when(serviceAreaService.findById(999L))
                .thenThrow(new ResourceNotFoundException("ServiceArea", 999L));

        mockMvc.perform(get("/service-areas/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("PATCH /service-areas/{id} should return 200 OK on partial update")
    void shouldReturn200OnPatch() throws Exception {
        ServiceAreaUpdateRequest updateRequest = new ServiceAreaUpdateRequest();
        updateRequest.setAreaName("Updated Name");

        when(serviceAreaService.update(eq(10L), any(ServiceAreaUpdateRequest.class)))
                .thenReturn(sampleResponse());

        mockMvc.perform(patch("/service-areas/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10L));
    }
}

