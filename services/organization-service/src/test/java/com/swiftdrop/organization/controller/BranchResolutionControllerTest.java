package com.swiftdrop.organization.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
import com.swiftdrop.organization.exception.GlobalExceptionHandler;
import com.swiftdrop.organization.exception.UnsupportedServiceAreaException;
import com.swiftdrop.organization.service.BranchResolutionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BranchResolutionController.class)
@Import(GlobalExceptionHandler.class)
class BranchResolutionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BranchResolutionService resolutionService;

    @Test
    @DisplayName("POST /branches/resolve should return 200 OK when nearest branch is resolved")
    void shouldReturn200OnSuccessfulResolution() throws Exception {
        BranchResolutionRequest request = new BranchResolutionRequest(6.9271, 79.8612);
        BranchResolutionResponse response = new BranchResolutionResponse(
                1L, "BR-COL-001", "Colombo Central Branch", 2.35, true
        );

        when(resolutionService.resolveNearestBranch(any(BranchResolutionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/branches/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchId").value(1L))
                .andExpect(jsonPath("$.branchCode").value("BR-COL-001"))
                .andExpect(jsonPath("$.branchName").value("Colombo Central Branch"))
                .andExpect(jsonPath("$.distanceKm").value(2.35))
                .andExpect(jsonPath("$.eligible").value(true));
    }

    @Test
    @DisplayName("POST /api/v1/branches/resolve should also work via dual mapping")
    void shouldSupportDirectRouteOnResolve() throws Exception {
        BranchResolutionRequest request = new BranchResolutionRequest(6.9271, 79.8612);
        BranchResolutionResponse response = new BranchResolutionResponse(
                1L, "BR-COL-001", "Colombo Central Branch", 2.35, true
        );

        when(resolutionService.resolveNearestBranch(any(BranchResolutionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/branches/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchId").value(1L));
    }

    @Test
    @DisplayName("POST /branches/resolve should return 400 Bad Request when coordinates are missing")
    void shouldReturn400WhenCoordinatesMissing() throws Exception {
        BranchResolutionRequest emptyRequest = new BranchResolutionRequest();

        mockMvc.perform(post("/branches/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.fieldErrors.latitude").exists())
                .andExpect(jsonPath("$.fieldErrors.longitude").exists());
    }

    @Test
    @DisplayName("POST /branches/resolve should return 400 Bad Request when coordinates are out of valid range")
    void shouldReturn400WhenCoordinatesOutOfRange() throws Exception {
        BranchResolutionRequest invalidRequest = new BranchResolutionRequest(95.0, 190.0);

        mockMvc.perform(post("/branches/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.latitude").exists())
                .andExpect(jsonPath("$.fieldErrors.longitude").exists());
    }

    @Test
    @DisplayName("POST /branches/resolve should return 422 Unprocessable Entity when location is unsupported")
    void shouldReturn422WhenUnsupportedLocation() throws Exception {
        BranchResolutionRequest request = new BranchResolutionRequest(7.2906, 80.6337);

        when(resolutionService.resolveNearestBranch(any(BranchResolutionRequest.class)))
                .thenThrow(new UnsupportedServiceAreaException(7.2906, 80.6337));

        mockMvc.perform(post("/branches/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value(
                        "Pickup location (latitude: 7.290600, longitude: 80.633700) is not supported by any active branch service area"));
    }
}

