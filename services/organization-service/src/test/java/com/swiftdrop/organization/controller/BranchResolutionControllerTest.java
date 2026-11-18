package com.swiftdrop.organization.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.config.SecurityConfig;
import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
import com.swiftdrop.organization.dto.RouteBranchResolutionRequest;
import com.swiftdrop.organization.dto.RouteBranchResolutionResponse;
import com.swiftdrop.organization.exception.GlobalExceptionHandler;
import com.swiftdrop.organization.exception.UnsupportedServiceAreaException;
import com.swiftdrop.organization.security.OrganizationJwtService;
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
@Import({GlobalExceptionHandler.class, SecurityConfig.class, OrganizationJwtService.class})
class BranchResolutionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BranchResolutionService resolutionService;

    @Test
    @DisplayName("POST /branches/resolve should return 200 OK when postal code is covered")
    void shouldReturn200OnSuccessfulResolution() throws Exception {
        BranchResolutionRequest request = new BranchResolutionRequest("00100");
        BranchResolutionResponse response = new BranchResolutionResponse(
                1L, "BR-COL-001", "Colombo Central Branch", 0.0, true
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
                .andExpect(jsonPath("$.eligible").value(true));
    }

    @Test
    @DisplayName("POST /api/v1/branches/resolve should also work via dual mapping")
    void shouldSupportDirectRouteOnResolve() throws Exception {
        BranchResolutionRequest request = new BranchResolutionRequest("00100");
        BranchResolutionResponse response = new BranchResolutionResponse(
                1L, "BR-COL-001", "Colombo Central Branch", 0.0, true
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
    @DisplayName("POST /branches/resolve should return 400 Bad Request when postalCode is missing")
    void shouldReturn400WhenPostalCodeMissing() throws Exception {
        BranchResolutionRequest emptyRequest = new BranchResolutionRequest();

        mockMvc.perform(post("/branches/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.fieldErrors.postalCode").exists());
    }

    @Test
    @DisplayName("POST /branches/resolve should return 400 Bad Request when postalCode is not 5 digits")
    void shouldReturn400WhenPostalCodeInvalidFormat() throws Exception {
        BranchResolutionRequest invalidRequest = new BranchResolutionRequest("123");

        mockMvc.perform(post("/branches/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.postalCode").exists());
    }

    @Test
    @DisplayName("POST /branches/resolve should return 422 Unprocessable Entity when postal code is unsupported")
    void shouldReturn422WhenUnsupportedPostalCode() throws Exception {
        BranchResolutionRequest request = new BranchResolutionRequest("40000");

        when(resolutionService.resolveNearestBranch(any(BranchResolutionRequest.class)))
                .thenThrow(new UnsupportedServiceAreaException("PICKUP", "40000"));

        mockMvc.perform(post("/branches/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.locationType").value("PICKUP"));
    }

    @Test
    @DisplayName("POST /branches/resolve-route should return 200 OK with origin and destination branches")
    void shouldReturn200OnRouteResolution() throws Exception {
        RouteBranchResolutionRequest request = new RouteBranchResolutionRequest("00100", "20000");
        RouteBranchResolutionResponse response = new RouteBranchResolutionResponse(
                new BranchResolutionResponse(1L, "BR-COL-001", "Colombo Central Branch", 0.0, true),
                new BranchResolutionResponse(2L, "BR-KAN-001", "Kandy City Branch", 0.0, true),
                false,
                94.42
        );

        when(resolutionService.resolveRoute(any(RouteBranchResolutionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/branches/resolve-route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originBranch.branchCode").value("BR-COL-001"))
                .andExpect(jsonPath("$.destinationBranch.branchCode").value("BR-KAN-001"))
                .andExpect(jsonPath("$.sameBranch").value(false))
                .andExpect(jsonPath("$.interBranchDistanceKm").value(94.42));
    }

    @Test
    @DisplayName("POST /branches/resolve-route should return 422 with locationType DESTINATION when dropoff postal code is uncovered")
    void shouldReturn422WithDestinationLocationTypeWhenDropoffUncovered() throws Exception {
        RouteBranchResolutionRequest request = new RouteBranchResolutionRequest("00100", "40000");

        when(resolutionService.resolveRoute(any(RouteBranchResolutionRequest.class)))
                .thenThrow(new UnsupportedServiceAreaException("DESTINATION", "40000"));

        mockMvc.perform(post("/branches/resolve-route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.locationType").value("DESTINATION"));
    }

    @Test
    @DisplayName("POST /branches/resolve-route should return 400 when dropoffPostalCode is missing")
    void shouldReturn400WhenDropoffPostalCodeMissing() throws Exception {
        RouteBranchResolutionRequest invalidRequest = new RouteBranchResolutionRequest("00100", null);

        mockMvc.perform(post("/branches/resolve-route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.dropoffPostalCode").exists());
    }
}
