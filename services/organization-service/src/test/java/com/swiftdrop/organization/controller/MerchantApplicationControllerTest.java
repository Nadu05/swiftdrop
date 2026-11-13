package com.swiftdrop.organization.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.config.SecurityConfig;
import com.swiftdrop.organization.dto.*;
import com.swiftdrop.organization.exception.GlobalExceptionHandler;
import com.swiftdrop.organization.security.OrganizationJwtService;
import com.swiftdrop.organization.service.MerchantApplicationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MerchantApplicationController.class)
@Import({GlobalExceptionHandler.class, SecurityConfig.class, OrganizationJwtService.class})
class MerchantApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MerchantApplicationService merchantApplicationService;

    private MerchantApplicationResponse sampleResponse(String status) {
        MerchantApplicationResponse resp = new MerchantApplicationResponse();
        resp.setId("APP-2026-0812");
        resp.setNumericId(1L);
        resp.setBusinessName("Ceylon Organic Harvest");
        resp.setLegalName("Ceylon Organic Harvest (Pvt) Ltd");
        resp.setBusinessRegistrationNumber("PV-00984122");
        resp.setCategory("GROCERY_FOOD");
        resp.setCategoryLabel("Grocery & Food");
        resp.setStatus(status);
        resp.setContactPerson(new MerchantApplicationResponse.ContactPersonDto(
                "Aruni Wickramasinghe", "Operations Director", "aruni@ceylonorganic.lk", "+94 77 458 9210"
        ));
        resp.setBusinessAddress(new MerchantApplicationResponse.BusinessAddressDto(
                "142 Vauxhall Street", "Colombo 02", "Colombo", "00200", "Colombo Central Hub"
        ));
        return resp;
    }

    @Test
    @DisplayName("POST /merchants/applications should return 201 Created when valid application is submitted")
    void shouldSubmitApplicationAndReturn201() throws Exception {
        MerchantApplicationCreateRequest request = new MerchantApplicationCreateRequest();
        request.setBusinessName("Ceylon Organic Harvest");
        request.setBusinessRegistrationNumber("PV-00984122");
        request.setCategory("GROCERY_FOOD");
        request.setContactFullName("Aruni Wickramasinghe");
        request.setContactEmail("aruni@ceylonorganic.lk");
        request.setContactPhone("+94 77 458 9210");
        request.setStreetAddress("142 Vauxhall Street");
        request.setCity("Colombo 02");

        when(merchantApplicationService.submitApplication(any(MerchantApplicationCreateRequest.class), any(), any()))
                .thenReturn(sampleResponse("PENDING"));

        mockMvc.perform(post("/merchants/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("APP-2026-0812"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.businessName").value("Ceylon Organic Harvest"));
    }

    @Test
    @DisplayName("GET /merchants/applications should return 200 OK with application list")
    void shouldListApplications() throws Exception {
        when(merchantApplicationService.findAll(any(), any(), any(), any()))
                .thenReturn(List.of(sampleResponse("PENDING")));

        mockMvc.perform(get("/merchants/applications").param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("APP-2026-0812"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @DisplayName("POST /merchants/applications/{id}/approve should return 401 when unauthenticated")
    void shouldDenyApproveWhenUnauthenticated() throws Exception {
        mockMvc.perform(post("/merchants/applications/APP-2026-0812/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "dispatcher@swiftdrop.lk", roles = {"DISPATCHER"})
    @DisplayName("POST /merchants/applications/{id}/approve should return 403 when user is DISPATCHER (not ADMIN)")
    void shouldDenyApproveWhenDispatcherRole() throws Exception {
        mockMvc.perform(post("/merchants/applications/APP-2026-0812/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@swiftdrop.lk", roles = {"ADMIN"})
    @DisplayName("POST /merchants/applications/{id}/approve should return 200 OK when user has ADMIN role")
    void shouldApproveApplicationWhenAdminRole() throws Exception {
        when(merchantApplicationService.approveApplication(eq("APP-2026-0812"), any(), any(), any()))
                .thenReturn(sampleResponse("APPROVED"));

        MerchantApplicationApproveRequest req = new MerchantApplicationApproveRequest("Approved by Head Office");

        mockMvc.perform(post("/merchants/applications/APP-2026-0812/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("APP-2026-0812"))
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @WithMockUser(username = "admin@swiftdrop.lk", roles = {"ADMIN"})
    @DisplayName("POST /merchants/applications/{id}/reject should return 200 OK when ADMIN provides rejection reason")
    void shouldRejectApplicationWhenAdminRole() throws Exception {
        MerchantApplicationResponse rejected = sampleResponse("REJECTED");
        rejected.setRejectionReason("Expired BRN document");

        when(merchantApplicationService.rejectApplication(eq("APP-2026-0812"), any(MerchantApplicationRejectRequest.class), any(), any()))
                .thenReturn(rejected);

        MerchantApplicationRejectRequest req = new MerchantApplicationRejectRequest("Expired BRN document", null);

        mockMvc.perform(post("/merchants/applications/APP-2026-0812/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("APP-2026-0812"))
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Expired BRN document"));
    }

    @Test
    @WithMockUser(username = "admin@swiftdrop.lk", roles = {"ADMIN"})
    @DisplayName("POST /merchants/applications/{id}/reject should return 400 when rejectionReason is blank")
    void shouldReturn400WhenRejectionReasonBlank() throws Exception {
        MerchantApplicationRejectRequest req = new MerchantApplicationRejectRequest("", null);

        mockMvc.perform(post("/merchants/applications/APP-2026-0812/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.rejectionReason").exists());
    }
}

