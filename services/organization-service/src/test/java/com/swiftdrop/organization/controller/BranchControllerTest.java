package com.swiftdrop.organization.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.dto.BranchUpdateRequest;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.GlobalExceptionHandler;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.service.BranchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BranchController.class)
@Import(GlobalExceptionHandler.class)
class BranchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BranchService branchService;

    private BranchResponse createSampleResponse() {
        return new BranchResponse(
                1L,
                "BR-COL-001",
                "Colombo Central Branch",
                "123 Galle Road",
                "Kollupitiya",
                "Colombo",
                "+94112345678",
                "colombo@swiftdrop.lk",
                6.9271,
                79.8612,
                "ACTIVE",
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("POST /branches should return 201 Created when request is valid")
    void shouldReturn201OnValidBranchCreation() throws Exception {
        BranchCreateRequest request = new BranchCreateRequest(
                "BR-COL-001",
                "Colombo Central Branch",
                "123 Galle Road",
                "Kollupitiya",
                "Colombo",
                "+94112345678",
                "colombo@swiftdrop.lk",
                6.9271,
                79.8612
        );

        when(branchService.create(any(BranchCreateRequest.class))).thenReturn(createSampleResponse());

        mockMvc.perform(post("/branches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.code").value("BR-COL-001"))
                .andExpect(jsonPath("$.name").value("Colombo Central Branch"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("POST /api/v1/branches should also work via dual mapping")
    void shouldSupportDirectRouteOnPost() throws Exception {
        BranchCreateRequest request = new BranchCreateRequest(
                "BR-COL-001",
                "Colombo Central Branch",
                "123 Galle Road",
                null,
                "Colombo",
                "+94112345678",
                null,
                6.9271,
                79.8612
        );

        when(branchService.create(any(BranchCreateRequest.class))).thenReturn(createSampleResponse());

        mockMvc.perform(post("/api/v1/branches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("BR-COL-001"));
    }

    @Test
    @DisplayName("POST /branches should return 400 Bad Request when required fields are missing")
    void shouldReturn400WhenRequiredFieldsMissing() throws Exception {
        BranchCreateRequest invalidRequest = new BranchCreateRequest();
        // Missing code, name, addressLine1, city, phone, latitude, longitude

        mockMvc.perform(post("/branches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.fieldErrors.code").exists())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.addressLine1").exists())
                .andExpect(jsonPath("$.fieldErrors.city").exists())
                .andExpect(jsonPath("$.fieldErrors.phone").exists())
                .andExpect(jsonPath("$.fieldErrors.latitude").exists())
                .andExpect(jsonPath("$.fieldErrors.longitude").exists());
    }

    @Test
    @DisplayName("POST /branches should return 400 Bad Request when coordinates are out of valid range")
    void shouldReturn400WhenCoordinatesAreInvalid() throws Exception {
        BranchCreateRequest invalidCoords = new BranchCreateRequest(
                "BR-COL-001",
                "Colombo Branch",
                "Galle Road",
                null,
                "Colombo",
                "+94112345678",
                null,
                95.5,   // invalid latitude > 90
                195.0   // invalid longitude > 180
        );

        mockMvc.perform(post("/branches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidCoords)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.latitude").exists())
                .andExpect(jsonPath("$.fieldErrors.longitude").exists());
    }

    @Test
    @DisplayName("POST /branches should return 409 Conflict when branch code already exists")
    void shouldReturn409WhenDuplicateCode() throws Exception {
        BranchCreateRequest request = new BranchCreateRequest(
                "BR-COL-001",
                "Colombo Central Branch",
                "123 Galle Road",
                null,
                "Colombo",
                "+94112345678",
                null,
                6.9271,
                79.8612
        );

        when(branchService.create(any(BranchCreateRequest.class)))
                .thenThrow(new DuplicateResourceException("Branch with code 'BR-COL-001' already exists"));

        mockMvc.perform(post("/branches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Branch with code 'BR-COL-001' already exists"));
    }

    @Test
    @DisplayName("GET /branches should return 200 OK with list of branches")
    void shouldReturnAllBranches() throws Exception {
        when(branchService.findAll(null)).thenReturn(List.of(createSampleResponse()));

        mockMvc.perform(get("/branches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("BR-COL-001"));
    }

    @Test
    @DisplayName("GET /branches?status=ACTIVE should return 200 OK with filtered list")
    void shouldReturnFilteredBranches() throws Exception {
        when(branchService.findAll(BranchStatus.ACTIVE)).thenReturn(List.of(createSampleResponse()));

        mockMvc.perform(get("/branches").param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));
    }

    @Test
    @DisplayName("GET /branches?status=INVALID should return 400 Bad Request")
    void shouldReturn400OnInvalidStatusFilter() throws Exception {
        mockMvc.perform(get("/branches").param("status", "INVALID_STATUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid status filter: 'INVALID_STATUS'. Allowed values: ACTIVE, INACTIVE"));
    }

    @Test
    @DisplayName("GET /branches/{id} should return 200 OK when branch exists")
    void shouldReturnBranchById() throws Exception {
        when(branchService.findById(1L)).thenReturn(createSampleResponse());

        mockMvc.perform(get("/branches/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.code").value("BR-COL-001"));
    }

    @Test
    @DisplayName("GET /branches/{id} should return 404 Not Found when branch does not exist")
    void shouldReturn404WhenBranchNotFound() throws Exception {
        when(branchService.findById(999L))
                .thenThrow(new ResourceNotFoundException("Branch", 999L));

        mockMvc.perform(get("/branches/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Branch not found with id: 999"));
    }

    @Test
    @DisplayName("PATCH /branches/{id} should return 200 OK on valid partial update")
    void shouldReturn200OnPatchUpdate() throws Exception {
        BranchUpdateRequest updateRequest = new BranchUpdateRequest();
        updateRequest.setStatus("INACTIVE");

        BranchResponse deactivatedResponse = createSampleResponse();
        deactivatedResponse.setStatus("INACTIVE");

        when(branchService.update(eq(1L), any(BranchUpdateRequest.class))).thenReturn(deactivatedResponse);

        mockMvc.perform(patch("/branches/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.status").value("INACTIVE"));
    }
}

