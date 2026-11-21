package com.swiftdrop.dispatch.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.config.SecurityConfig;
import com.swiftdrop.dispatch.dto.CourierSummaryDto;
import com.swiftdrop.dispatch.dto.DeliveryJobDto;
import com.swiftdrop.dispatch.dto.FailedDeliveryRequest;
import com.swiftdrop.dispatch.dto.ProofOfDeliveryRequest;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.exception.IdempotencyConflictException;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP-level behaviour of the courier management endpoints (auth, filters, idempotency header, error mapping). */
@WebMvcTest(DispatchController.class)
@Import({SecurityConfig.class, DispatchJwtAuthenticationFilter.class, DispatchJwtService.class})
class CourierManagementControllerTest {

    private static final String BASE = "/api/v1/dispatch/couriers/me";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private DispatchService dispatchService;

    private UsernamePasswordAuthenticationToken courier() {
        DispatchUserPrincipal principal = new DispatchUserPrincipal(
                "courier-101", "courier-101@swiftdrop.lk", List.of("COURIER"), 1L);
        return new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_COURIER")));
    }

    @Test
    void unauthenticatedCourierEndpointsReturn401() throws Exception {
        mockMvc.perform(get(BASE + "/summary")).andExpect(status().isUnauthorized());
        mockMvc.perform(get(BASE + "/assignments")).andExpect(status().isUnauthorized());
        mockMvc.perform(get(BASE + "/assignments/ASN-1")).andExpect(status().isUnauthorized());
        mockMvc.perform(post(BASE + "/assignments/ASN-1/accept")).andExpect(status().isUnauthorized());
    }

    @Test
    void assignmentsPassStatusAndDateFiltersToTheService() throws Exception {
        when(dispatchService.getMyCourierJobs(eq("PENDING"), eq(LocalDate.of(2026, 11, 1)),
                eq(LocalDate.of(2026, 11, 15)), any())).thenReturn(List.of(new DeliveryJobDto()));

        mockMvc.perform(get(BASE + "/assignments")
                        .param("status", "PENDING").param("from", "2026-11-01").param("to", "2026-11-15")
                        .with(authentication(courier())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void invalidFilterIsReportedAs400() throws Exception {
        when(dispatchService.getMyCourierJobs(eq("BOGUS"), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Invalid status filter: BOGUS"));

        mockMvc.perform(get(BASE + "/assignments").param("status", "BOGUS").with(authentication(courier())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(BASE + "/assignments").param("from", "not-a-date").with(authentication(courier())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void summaryReturnsCountsAndWorkload() throws Exception {
        CourierSummaryDto dto = new CourierSummaryDto();
        dto.setTotalAssigned(5);
        dto.setPending(2);
        dto.setCompleted(2);
        dto.setFailed(1);
        dto.setWorkloadPercent(25);
        dto.setWorkloadLevel("LOW");
        when(dispatchService.getMyCourierSummary(any(), any())).thenReturn(dto);

        mockMvc.perform(get(BASE + "/summary").with(authentication(courier())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAssigned").value(5))
                .andExpect(jsonPath("$.pending").value(2))
                .andExpect(jsonPath("$.completed").value(2))
                .andExpect(jsonPath("$.failed").value(1))
                .andExpect(jsonPath("$.workloadLevel").value("LOW"));
    }

    @Test
    void detailOfAnotherCouriersJobIsForbidden() throws Exception {
        when(dispatchService.getMyCourierJobDetail(eq("ASN-9"), any()))
                .thenThrow(new AccessDeniedException("Courier is not authorized for this assignment"));

        mockMvc.perform(get(BASE + "/assignments/ASN-9").with(authentication(courier())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void detailReturnsAllowedActions() throws Exception {
        DeliveryJobDto dto = new DeliveryJobDto();
        dto.setAssignmentId("ASN-1");
        dto.setStatus("ASSIGNED");
        dto.setAllowedActions(List.of("ACCEPT"));
        when(dispatchService.getMyCourierJobDetail(eq("ASN-1"), any())).thenReturn(dto);

        mockMvc.perform(get(BASE + "/assignments/ASN-1").with(authentication(courier())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allowedActions[0]").value("ACCEPT"));
    }

    @Test
    void invalidTransitionIsReportedAs422() throws Exception {
        when(dispatchService.markPickedUp(eq("ASN-1"), any(), any()))
                .thenThrow(new DispatchValidationException("INVALID_TRANSITION", "Action PICKUP is not allowed"));

        mockMvc.perform(post(BASE + "/assignments/ASN-1/pickup").with(authentication(courier())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("INVALID_TRANSITION"));
    }

    @Test
    void idempotencyKeyHeaderIsForwardedOnDeliver() throws Exception {
        DeliveryJobDto dto = new DeliveryJobDto();
        dto.setStatus("DELIVERED");
        when(dispatchService.completeDelivery(eq("ASN-1"), any(ProofOfDeliveryRequest.class), any(), eq("key-123")))
                .thenReturn(dto);

        ProofOfDeliveryRequest req = new ProofOfDeliveryRequest();
        req.setRecipientName("Amaya");
        req.setProofType("PHOTO");
        req.setPhotoEvidenceReference("https://files.example/pod.jpg");

        mockMvc.perform(post(BASE + "/assignments/ASN-1/deliver")
                        .header("Idempotency-Key", "key-123")
                        .with(authentication(courier()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"));
    }

    @Test
    void failWithoutReasonIsRejectedBeforeReachingTheService() throws Exception {
        mockMvc.perform(post(BASE + "/assignments/ASN-1/fail")
                        .with(authentication(courier()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new FailedDeliveryRequest("", "notes"))))
                .andExpect(status().isBadRequest());
        verify(dispatchService, never()).recordFailedDelivery(any(), any(), any(), any());
    }

    @Test
    void concurrentUpdateIsReportedAs409() throws Exception {
        when(dispatchService.acceptAssignment(eq("ASN-1"), any(), any()))
                .thenThrow(new ObjectOptimisticLockingFailureException(com.swiftdrop.dispatch.entity.CourierAssignment.class, 1L));

        mockMvc.perform(post(BASE + "/assignments/ASN-1/accept").with(authentication(courier())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("CONCURRENT_UPDATE"));
    }

    @Test
    void reusedIdempotencyKeyWithDifferentPayloadIsReportedAs409() throws Exception {
        when(dispatchService.recordFailedDelivery(eq("ASN-1"), any(FailedDeliveryRequest.class), any(), eq("k")))
                .thenThrow(new IdempotencyConflictException("Idempotency-Key was already used for a different request"));

        mockMvc.perform(post(BASE + "/assignments/ASN-1/fail")
                        .header("Idempotency-Key", "k")
                        .with(authentication(courier()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new FailedDeliveryRequest("No answer", null))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("IDEMPOTENCY_CONFLICT"));
    }

    @Test
    void podPhotoUploadReturnsEvidenceReference() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "pod.png", "image/png", new byte[]{1, 2, 3});
        when(dispatchService.storeCourierPodPhoto(eq("ASN-1"), any(byte[].class), eq("image/png"), any()))
                .thenReturn("pod-storage://photo/SD-1-photo-ab12.png");

        mockMvc.perform(multipart(BASE + "/assignments/ASN-1/pod-photo").file(file).with(authentication(courier())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoEvidenceReference").value("pod-storage://photo/SD-1-photo-ab12.png"));
    }

    @Test
    void podPhotoWithUnsupportedTypeIsReportedAs422() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "pod.pdf", "application/pdf", new byte[]{1});
        when(dispatchService.storeCourierPodPhoto(eq("ASN-1"), any(byte[].class), eq("application/pdf"), any()))
                .thenThrow(new DispatchValidationException("POD_PHOTO_UNSUPPORTED_TYPE", "Only JPEG or PNG photos are accepted"));

        mockMvc.perform(multipart(BASE + "/assignments/ASN-1/pod-photo").file(file).with(authentication(courier())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("POD_PHOTO_UNSUPPORTED_TYPE"));
    }
}
