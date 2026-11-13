package com.swiftdrop.organization.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.dto.MerchantRegistrationRequest;
import com.swiftdrop.organization.dto.MerchantRejectionRequest;
import com.swiftdrop.organization.dto.MerchantResponse;
import com.swiftdrop.organization.dto.MerchantSuspensionRequest;
import com.swiftdrop.organization.dto.MerchantUpdateRequest;
import com.swiftdrop.organization.entity.enums.MerchantStatus;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.GlobalExceptionHandler;
import com.swiftdrop.organization.exception.InvalidMerchantStatusTransitionException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.service.MerchantService;
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

@WebMvcTest(MerchantController.class)
@Import(GlobalExceptionHandler.class)
class MerchantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MerchantService merchantService;

    private MerchantResponse sampleResponse(String status) {
        return new MerchantResponse(
                10L,
                "user-uuid-123",
                "Fresh Mart Supermarket",
                "PV-12345",
                "GROCERY_FOOD",
                "Kamal Perera",
                "kamal@freshmart.lk",
                "+94771234567",
                "10 Galle Road",
                "Bambalapitiya",
                "Colombo",
                status,
                null,
                null,
                null,
                LocalDateTime.now(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("POST /api/v1/merchants - 201 Created on valid registration")
    void register_Valid_Returns201() throws Exception {
        MerchantRegistrationRequest request = new MerchantRegistrationRequest(
                "user-uuid-123",
                "Fresh Mart Supermarket",
                "PV-12345",
                "GROCERY_FOOD",
                "Kamal Perera",
                "kamal@freshmart.lk",
                "+94771234567",
                "10 Galle Road",
                "Bambalapitiya",
                "Colombo"
        );

        when(merchantService.register(any(MerchantRegistrationRequest.class)))
                .thenReturn(sampleResponse("PENDING"));

        mockMvc.perform(post("/api/v1/merchants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.businessName").value("Fresh Mart Supermarket"));
    }

    @Test
    @DisplayName("POST /merchants - 201 Created on direct/gateway route")
    void register_DirectMapping_Returns201() throws Exception {
        MerchantRegistrationRequest request = new MerchantRegistrationRequest(
                "user-uuid-123",
                "Fresh Mart Supermarket",
                "PV-12345",
                "GROCERY_FOOD",
                "Kamal Perera",
                "kamal@freshmart.lk",
                "+94771234567",
                "10 Galle Road",
                null,
                "Colombo"
        );

        when(merchantService.register(any(MerchantRegistrationRequest.class)))
                .thenReturn(sampleResponse("PENDING"));

        mockMvc.perform(post("/merchants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    @DisplayName("POST /api/v1/merchants - 400 Bad Request on missing required fields")
    void register_Invalid_Returns400() throws Exception {
        MerchantRegistrationRequest request = new MerchantRegistrationRequest(
                "",
                "",
                "invalid brn @@@",
                "",
                "",
                "invalid-email",
                "invalid-phone",
                "",
                null,
                ""
        );

        mockMvc.perform(post("/api/v1/merchants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors").isMap());
    }

    @Test
    @DisplayName("POST /api/v1/merchants - 409 Conflict when merchant already registered")
    void register_Duplicate_Returns409() throws Exception {
        MerchantRegistrationRequest request = new MerchantRegistrationRequest(
                "user-uuid-123",
                "Fresh Mart",
                "PV-12345",
                "GROCERY_FOOD",
                "Kamal",
                "kamal@fm.lk",
                "+94771234567",
                "10 Galle Road",
                null,
                "Colombo"
        );

        when(merchantService.register(any(MerchantRegistrationRequest.class)))
                .thenThrow(new DuplicateResourceException("Merchant profile already exists for user: user-uuid-123"));

        mockMvc.perform(post("/api/v1/merchants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    @DisplayName("GET /api/v1/merchants/{id} - 200 OK")
    void getById_Success_Returns200() throws Exception {
        when(merchantService.findById(10L)).thenReturn(sampleResponse("PENDING"));

        mockMvc.perform(get("/api/v1/merchants/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.businessRegistrationNumber").value("PV-12345"));
    }

    @Test
    @DisplayName("GET /api/v1/merchants/{id} - 404 Not Found")
    void getById_NotFound_Returns404() throws Exception {
        when(merchantService.findById(999L)).thenThrow(new ResourceNotFoundException("Merchant", 999L));

        mockMvc.perform(get("/api/v1/merchants/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("GET /api/v1/merchants/by-user/{identityUserId} - 200 OK")
    void getByIdentityUserId_Success_Returns200() throws Exception {
        when(merchantService.findByIdentityUserId("user-uuid-123")).thenReturn(sampleResponse("APPROVED"));

        mockMvc.perform(get("/api/v1/merchants/by-user/user-uuid-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identityUserId").value("user-uuid-123"))
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @DisplayName("GET /api/v1/merchants - 200 OK list all")
    void getAll_Returns200() throws Exception {
        when(merchantService.findAll(null)).thenReturn(List.of(sampleResponse("APPROVED")));

        mockMvc.perform(get("/api/v1/merchants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(10));
    }

    @Test
    @DisplayName("GET /api/v1/merchants/pending and /merchants/pending - 200 OK")
    void getPending_Returns200() throws Exception {
        when(merchantService.findPendingApplications()).thenReturn(List.of(sampleResponse("PENDING")));

        mockMvc.perform(get("/api/v1/merchants/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));

        mockMvc.perform(get("/merchants/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @DisplayName("PATCH /api/v1/merchants/{id} - 200 OK")
    void update_Valid_Returns200() throws Exception {
        MerchantUpdateRequest request = new MerchantUpdateRequest(
                "Fresh Mart Supermarket Updated",
                "PV-12345",
                "RETAIL",
                "Kamal Perera",
                "kamal@freshmart.lk",
                "+94771234567",
                "10 Galle Road",
                null,
                "Colombo"
        );

        when(merchantService.update(eq(10L), any(MerchantUpdateRequest.class)))
                .thenReturn(sampleResponse("PENDING"));

        mockMvc.perform(patch("/api/v1/merchants/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    @DisplayName("PUT /api/v1/merchants/{id} - 200 OK")
    void updatePut_Valid_Returns200() throws Exception {
        MerchantUpdateRequest request = new MerchantUpdateRequest(
                "Fresh Mart Supermarket Updated",
                "PV-12345",
                "RETAIL",
                "Kamal Perera",
                "kamal@freshmart.lk",
                "+94771234567",
                "10 Galle Road",
                null,
                "Colombo"
        );

        when(merchantService.update(eq(10L), any(MerchantUpdateRequest.class)))
                .thenReturn(sampleResponse("PENDING"));

        mockMvc.perform(put("/api/v1/merchants/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    @DisplayName("POST /api/v1/merchants/{id}/approve - 200 OK")
    void approve_Success_Returns200() throws Exception {
        when(merchantService.approve(10L)).thenReturn(sampleResponse("APPROVED"));

        mockMvc.perform(post("/api/v1/merchants/10/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(post("/merchants/10/approve"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/v1/merchants/{id}/reject - 200 OK with reason")
    void reject_Success_Returns200() throws Exception {
        MerchantRejectionRequest request = new MerchantRejectionRequest("Documents illegible");
        when(merchantService.reject(10L, "Documents illegible"))
                .thenReturn(sampleResponse("REJECTED"));

        mockMvc.perform(post("/api/v1/merchants/10/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    @DisplayName("POST /api/v1/merchants/{id}/reject - 400 Bad Request if reason is blank")
    void reject_MissingReason_Returns400() throws Exception {
        MerchantRejectionRequest request = new MerchantRejectionRequest("");

        mockMvc.perform(post("/api/v1/merchants/10/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("POST /api/v1/merchants/{id}/suspend - 200 OK with reason")
    void suspend_Success_Returns200() throws Exception {
        MerchantSuspensionRequest request = new MerchantSuspensionRequest("Non-compliance with terms");
        when(merchantService.suspend(10L, "Non-compliance with terms"))
                .thenReturn(sampleResponse("SUSPENDED"));

        mockMvc.perform(post("/api/v1/merchants/10/suspend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));
    }

    @Test
    @DisplayName("POST /api/v1/merchants/{id}/suspend - 400 Bad Request if reason is blank")
    void suspend_MissingReason_Returns400() throws Exception {
        MerchantSuspensionRequest request = new MerchantSuspensionRequest(" ");

        mockMvc.perform(post("/api/v1/merchants/10/suspend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("POST /api/v1/merchants/{id}/reactivate - 200 OK")
    void reactivate_Success_Returns200() throws Exception {
        when(merchantService.reactivate(10L)).thenReturn(sampleResponse("APPROVED"));

        mockMvc.perform(post("/api/v1/merchants/10/reactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @DisplayName("POST /api/v1/merchants/{id}/approve - 409 Conflict when transition is invalid")
    void approve_InvalidTransition_Returns409() throws Exception {
        when(merchantService.approve(10L))
                .thenThrow(new InvalidMerchantStatusTransitionException(10L, MerchantStatus.APPROVED, MerchantStatus.APPROVED));

        mockMvc.perform(post("/api/v1/merchants/10/approve"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }
}
