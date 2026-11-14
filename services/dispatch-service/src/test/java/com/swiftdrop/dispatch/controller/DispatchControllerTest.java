package com.swiftdrop.dispatch.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.config.SecurityConfig;
import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.security.DispatchJwtAuthenticationFilter;
import com.swiftdrop.dispatch.security.DispatchJwtService;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import com.swiftdrop.dispatch.service.DispatchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DispatchController.class)
@Import({SecurityConfig.class, DispatchJwtAuthenticationFilter.class, DispatchJwtService.class})
class DispatchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DispatchService dispatchService;

    private UsernamePasswordAuthenticationToken authFor(String userId, String role, Long branchId) {
        DispatchUserPrincipal principal = new DispatchUserPrincipal(
                userId,
                userId + "@swiftdrop.lk",
                List.of(role),
                branchId
        );
        return new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
        );
    }

    @Test
    void unauthenticatedRequest_Returns401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/dispatch/assignments"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void createAssignment_AsDispatcher_Returns201Created() throws Exception {
        AssignmentRecordDto dto = new AssignmentRecordDto();
        dto.setAssignmentId("ASN-7001");
        dto.setAssignmentCode("ASN-7001");
        dto.setOrderId("101");
        dto.setTrackingNumber("SD-10101");
        dto.setStatus("ASSIGNED");

        when(dispatchService.assignCourier(any(AssignCourierRequest.class), any()))
                .thenReturn(dto);

        AssignCourierRequest req = new AssignCourierRequest();
        req.setOrderId("101");
        req.setCourierId("CR-101");

        mockMvc.perform(post("/api/v1/dispatch/assignments")
                        .with(authentication(authFor("disp-1", "DISPATCHER", 1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentCode").value("ASN-7001"))
                .andExpect(jsonPath("$.status").value("ASSIGNED"));
    }

    @Test
    void confirmBranchDropoff_AsDispatcher_Returns200Ok() throws Exception {
        PickupTaskDto dto = new PickupTaskDto();
        dto.setTaskCode("PKP-1001");
        dto.setOrderId("102");
        dto.setTrackingNumber("SD-10202");
        dto.setPickupMethod("BRANCH_DROPOFF");
        dto.setStatus("BRANCH_RECEIVED");
        dto.setParcelReference("PRC-SD-10202");

        when(dispatchService.confirmBranchDropoff(any(BranchDropoffConfirmRequest.class), any()))
                .thenReturn(dto);

        BranchDropoffConfirmRequest req = new BranchDropoffConfirmRequest();
        req.setOrderId("102");
        req.setTrackingNumber("SD-10202");
        req.setParcelReference("PRC-SD-10202");

        mockMvc.perform(post("/api/v1/dispatch/branch-dropoff")
                        .with(authentication(authFor("disp-1", "DISPATCHER", 1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BRANCH_RECEIVED"))
                .andExpect(jsonPath("$.parcelReference").value("PRC-SD-10202"));
    }

    @Test
    void reportFailedDelivery_MaxAttemptsReached_Returns422UnprocessableEntity() throws Exception {
        when(dispatchService.recordFailedDelivery(eq("ASN-7001"), any(FailedDeliveryRequest.class), any()))
                .thenThrow(new DispatchValidationException(
                        "MAX_ATTEMPTS_EXCEEDED",
                        "Maximum delivery attempts (3) reached; awaiting dispatcher exception decision"
                ));

        FailedDeliveryRequest req = new FailedDeliveryRequest("Recipient not available", "3rd attempt");

        mockMvc.perform(post("/api/v1/dispatch/couriers/me/assignments/ASN-7001/fail")
                        .with(authentication(authFor("courier-101", "COURIER", 1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("MAX_ATTEMPTS_EXCEEDED"));
    }

    @Test
    void resolveException_CourierForbidden_Returns403() throws Exception {
        when(dispatchService.resolveException(eq("EXC-5001"), any(ExceptionDecisionRequest.class), any()))
                .thenThrow(new AccessDeniedException("Only DISPATCHER or ADMIN roles can resolve delivery exceptions"));

        ExceptionDecisionRequest req = new ExceptionDecisionRequest("RETURN_TO_SENDER", "Recipient refused");

        mockMvc.perform(post("/api/v1/dispatch/exceptions/EXC-5001/resolve")
                        .with(authentication(authFor("courier-101", "COURIER", 1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }
}

