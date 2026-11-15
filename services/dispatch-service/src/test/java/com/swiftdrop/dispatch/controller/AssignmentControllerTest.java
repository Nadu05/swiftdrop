package com.swiftdrop.dispatch.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.dto.AssignmentHistoryResponse;
import com.swiftdrop.dispatch.dto.AssignmentReassignRequest;
import com.swiftdrop.dispatch.dto.AssignmentRequest;
import com.swiftdrop.dispatch.dto.AssignmentResponse;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.exception.*;
import com.swiftdrop.dispatch.service.AssignmentService;
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

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AssignmentController.class)
@Import(GlobalExceptionHandler.class)
@org.springframework.test.context.ActiveProfiles("test")
class AssignmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AssignmentService assignmentService;

    // ==========================================
    // Task 05 & 06 Tests: Assignment Creation
    // ==========================================

    @Test
    @DisplayName("Should create assignment successfully at /api/v1/dispatch/assignments")
    void shouldCreateAssignmentSuccessfully() throws Exception {
        AssignmentRequest request = new AssignmentRequest(101L, 5L);
        AssignmentResponse response = new AssignmentResponse(
                1L, "ASN-1234ABCD", 101L, 5L, "CR-101", 100L, 1L,
                AssignmentStatus.ASSIGNED, LocalDateTime.now()
        );

        when(assignmentService.createAssignment(any(AssignmentRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/dispatch/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.assignmentCode", is("ASN-1234ABCD")))
                .andExpect(jsonPath("$.orderId", is(101)))
                .andExpect(jsonPath("$.courierId", is(5)))
                .andExpect(jsonPath("$.status", is("ASSIGNED")));
    }

    @Test
    @DisplayName("Should support gateway forwarded dual-mapping at /assignments")
    void shouldSupportDualMappingAtAssignments() throws Exception {
        AssignmentRequest request = new AssignmentRequest(101L, 5L);
        AssignmentResponse response = new AssignmentResponse(
                1L, "ASN-1234ABCD", 101L, 5L, "CR-101", 100L, 1L,
                AssignmentStatus.ASSIGNED, LocalDateTime.now()
        );

        when(assignmentService.createAssignment(any(AssignmentRequest.class))).thenReturn(response);

        mockMvc.perform(post("/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)));
    }

    @Test
    @DisplayName("Should return HTTP 404 when courier does not exist")
    void shouldReturn404WhenCourierNotFound() throws Exception {
        AssignmentRequest request = new AssignmentRequest(101L, 999L);

        when(assignmentService.createAssignment(any(AssignmentRequest.class)))
                .thenThrow(new ResourceNotFoundException("Courier", 999L));

        mockMvc.perform(post("/api/v1/dispatch/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @DisplayName("Should return HTTP 400 when courier is not available")
    void shouldReturn400WhenCourierUnavailable() throws Exception {
        AssignmentRequest request = new AssignmentRequest(101L, 5L);

        when(assignmentService.createAssignment(any(AssignmentRequest.class)))
                .thenThrow(new CourierNotAvailableException("Courier is currently busy"));

        mockMvc.perform(post("/api/v1/dispatch/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Courier Not Available")))
                .andExpect(jsonPath("$.message", is("Courier is currently busy")));
    }

    @Test
    @DisplayName("Should return HTTP 409 when order already has an active assignment")
    void shouldReturn409WhenDuplicateAssignment() throws Exception {
        AssignmentRequest request = new AssignmentRequest(101L, 5L);

        when(assignmentService.createAssignment(any(AssignmentRequest.class)))
                .thenThrow(new DuplicateAssignmentException("Order 101 already has an active courier assignment"));

        mockMvc.perform(post("/api/v1/dispatch/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", is("Order 101 already has an active courier assignment")));
    }

    @Test
    @DisplayName("Should return HTTP 503 when Order Service is unavailable")
    void shouldReturn503WhenOrderServiceUnavailable() throws Exception {
        AssignmentRequest request = new AssignmentRequest(101L, 5L);

        when(assignmentService.createAssignment(any(AssignmentRequest.class)))
                .thenThrow(new ServiceUnavailableException("Order Service is unreachable"));

        mockMvc.perform(post("/api/v1/dispatch/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status", is(503)))
                .andExpect(jsonPath("$.error", is("Service Unavailable")));
    }

    @Test
    @DisplayName("Should return HTTP 400 when request validation fails")
    void shouldReturn400WhenRequestValidationFails() throws Exception {
        AssignmentRequest invalidRequest = new AssignmentRequest(null, null);

        mockMvc.perform(post("/api/v1/dispatch/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Validation Failed")));
    }

    // ==========================================
    // Task 07 Tests: Part A — Retrieval
    // ==========================================

    @Test
    @DisplayName("Task 07: Should list all assignments with optional query filters")
    void shouldListAllAssignmentsWithFilters() throws Exception {
        AssignmentResponse r1 = new AssignmentResponse(
                1L, "ASN-1234ABCD", 101L, 5L, "CR-101", 100L, 1L,
                AssignmentStatus.ASSIGNED, LocalDateTime.now()
        );

        when(assignmentService.findAll(5L, 100L, AssignmentStatus.ASSIGNED, 101L))
                .thenReturn(List.of(r1));

        mockMvc.perform(get("/api/v1/dispatch/assignments")
                        .param("courierId", "5")
                        .param("branchId", "100")
                        .param("status", "ASSIGNED")
                        .param("orderId", "101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].courierId", is(5)));
    }

    @Test
    @DisplayName("Task 07: Should support gateway stripped dual mapping at GET /assignments")
    void shouldSupportDualMappingForGetAllAssignments() throws Exception {
        when(assignmentService.findAll(null, null, null, null))
                .thenReturn(List.of());

        mockMvc.perform(get("/assignments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Task 07: Should get assignment by ID successfully")
    void shouldGetAssignmentByIdSuccessfully() throws Exception {
        AssignmentResponse response = new AssignmentResponse(
                10L, "ASN-TEST10", 200L, 5L, "CR-101", 100L, 1L,
                AssignmentStatus.ASSIGNED, LocalDateTime.now()
        );

        when(assignmentService.findById(10L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/dispatch/assignments/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.assignmentCode", is("ASN-TEST10")))
                .andExpect(jsonPath("$.courierCode", is("CR-101")));
    }

    @Test
    @DisplayName("Task 07: Should return 404 when getting nonexistent assignment by ID")
    void shouldReturn404WhenAssignmentByIdNotFound() throws Exception {
        when(assignmentService.findById(999L)).thenThrow(new ResourceNotFoundException("Assignment", 999L));

        mockMvc.perform(get("/api/v1/dispatch/assignments/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @DisplayName("Task 07: Should get assignment history chronologically")
    void shouldGetAssignmentHistorySuccessfully() throws Exception {
        AssignmentHistoryResponse h1 = new AssignmentHistoryResponse(
                1L, 10L, null, null, null,
                5L, "CR-101", "Kamal Silva", 1L, "Initial allocation", LocalDateTime.now()
        );

        when(assignmentService.findHistoryByAssignmentId(10L)).thenReturn(List.of(h1));

        mockMvc.perform(get("/api/v1/dispatch/assignments/10/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].assignmentId", is(10)))
                .andExpect(jsonPath("$[0].newCourierCode", is("CR-101")));
    }

    @Test
    @DisplayName("Task 07: Should return 404 when getting history for nonexistent assignment")
    void shouldReturn404WhenAssignmentHistoryNotFound() throws Exception {
        when(assignmentService.findHistoryByAssignmentId(999L))
                .thenThrow(new ResourceNotFoundException("Assignment", 999L));

        mockMvc.perform(get("/api/v1/dispatch/assignments/999/history"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    // ==========================================
    // Task 07 Tests: Part B — Reassignment
    // ==========================================

    @Test
    @DisplayName("Task 07: Should successfully reassign courier with PATCH /api/v1/dispatch/assignments/{id}")
    void shouldSuccessfullyReassignCourier() throws Exception {
        AssignmentReassignRequest request = new AssignmentReassignRequest(8L, "Original courier unavailable");
        AssignmentResponse response = new AssignmentResponse(
                10L, "ASN-TEST10", 200L, 8L, "CR-102", 100L, 1L,
                AssignmentStatus.ASSIGNED, LocalDateTime.now()
        );

        when(assignmentService.reassignCourier(eq(10L), any(AssignmentReassignRequest.class)))
                .thenReturn(response);

        mockMvc.perform(patch("/api/v1/dispatch/assignments/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("X-User-Id", 42L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.courierId", is(8)))
                .andExpect(jsonPath("$.courierCode", is("CR-102")));
    }

    @Test
    @DisplayName("Task 07: Should support gateway stripped dual mapping at PATCH /assignments/{id}")
    void shouldSupportDualMappingForReassignCourier() throws Exception {
        AssignmentReassignRequest request = new AssignmentReassignRequest(8L, "Original courier unavailable");
        AssignmentResponse response = new AssignmentResponse(
                10L, "ASN-TEST10", 200L, 8L, "CR-102", 100L, 1L,
                AssignmentStatus.ASSIGNED, LocalDateTime.now()
        );

        when(assignmentService.reassignCourier(eq(10L), any(AssignmentReassignRequest.class)))
                .thenReturn(response);

        mockMvc.perform(patch("/assignments/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(10)));
    }

    @Test
    @DisplayName("Task 07: Should return 404 when reassigning nonexistent assignment")
    void shouldReturn404WhenReassigningNonexistentAssignment() throws Exception {
        AssignmentReassignRequest request = new AssignmentReassignRequest(8L, "Reassign");

        when(assignmentService.reassignCourier(eq(999L), any(AssignmentReassignRequest.class)))
                .thenThrow(new ResourceNotFoundException("Assignment", 999L));

        mockMvc.perform(patch("/api/v1/dispatch/assignments/999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @DisplayName("Task 07: Should return 400 when reassigning terminal assignment (DELIVERED/CANCELLED)")
    void shouldReturn400WhenReassigningTerminalAssignment() throws Exception {
        AssignmentReassignRequest request = new AssignmentReassignRequest(8L, "Reassign");

        when(assignmentService.reassignCourier(eq(10L), any(AssignmentReassignRequest.class)))
                .thenThrow(new InvalidAssignmentStateException("Cannot reassign assignment with status 'DELIVERED'"));

        mockMvc.perform(patch("/api/v1/dispatch/assignments/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", is("Cannot reassign assignment with status 'DELIVERED'")));
    }

    @Test
    @DisplayName("Task 07: Should return 400 when reassigning with invalid body (missing courierId)")
    void shouldReturn400WhenReassigningWithoutCourierId() throws Exception {
        AssignmentReassignRequest request = new AssignmentReassignRequest(null, "Reassign");

        mockMvc.perform(patch("/api/v1/dispatch/assignments/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Validation Failed")));
    }

    // ==========================================
    // Task 08 & 09 Tests: Status Update & Authorization
    // ==========================================

    @Test
    @DisplayName("Task 08 & 09: Should update assignment status successfully")
    void shouldUpdateAssignmentStatusSuccessfully() throws Exception {
        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest request =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.ACCEPTED, "Order accepted");
        AssignmentResponse response = new AssignmentResponse(
                10L, "ASN-TEST10", 200L, 5L, "CR-101", 100L, 1L,
                AssignmentStatus.ACCEPTED, LocalDateTime.now()
        );

        when(assignmentService.updateAssignmentStatus(eq(10L), any(), eq(42L), eq(true)))
                .thenReturn(response);

        mockMvc.perform(patch("/api/v1/dispatch/assignments/10/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("X-User-Id", 42L)
                        .header("X-User-Role", "COURIER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.status", is("ACCEPTED")));
    }

    @Test
    @DisplayName("Task 08: Should return HTTP 403 Forbidden when courier does not own assignment")
    void shouldReturn403WhenCourierDoesNotOwnAssignment() throws Exception {
        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest request =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.ACCEPTED, "Order accepted");

        when(assignmentService.updateAssignmentStatus(eq(10L), any(), eq(999L), eq(true)))
                .thenThrow(new AccessDeniedException("Courier is not authorized to update assignment 10"));

        mockMvc.perform(patch("/api/v1/dispatch/assignments/10/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("X-User-Id", 999L)
                        .header("X-User-Role", "COURIER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", is("Courier is not authorized to update assignment 10")));
    }

    @Test
    @DisplayName("Task 08: Should get courier own assignments when authenticated with X-User-Id")
    void shouldGetCourierOwnAssignments() throws Exception {
        AssignmentResponse response = new AssignmentResponse(
                10L, "ASN-TEST10", 200L, 5L, "CR-101", 100L, 1L,
                AssignmentStatus.ASSIGNED, LocalDateTime.now()
        );

        when(assignmentService.findAssignmentsForCourierUser(42L))
                .thenReturn(List.of(response));

        mockMvc.perform(get("/api/v1/dispatch/assignments/my-assignments")
                        .header("X-User-Id", 42L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(10)));
    }

    @Test
    @DisplayName("Task 08: Should return HTTP 401 Unauthorized when accessing my-assignments without X-User-Id")
    void shouldReturn401WhenMissingUserIdentity() throws Exception {
        mockMvc.perform(get("/api/v1/dispatch/assignments/my-assignments"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", is("Authentication required: missing user identity")));
    }

    @Test
    @DisplayName("Task 11: Should return HTTP 401 Unauthorized when updating status without X-User-Id or X-User-Role")
    void shouldReturn401WhenUpdatingStatusWithoutAuthHeaders() throws Exception {
        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest request =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.ACCEPTED, "Accepted");

        mockMvc.perform(patch("/api/v1/dispatch/assignments/10/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));

        mockMvc.perform(patch("/api/v1/dispatch/assignments/10/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("X-User-Id", 42L))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", is("Authentication required: missing user role")));
    }

    @Test
    @DisplayName("Task 11: Should return HTTP 403 Forbidden when updating status with unauthorized role")
    void shouldReturn403WhenUpdatingStatusWithCustomerRole() throws Exception {
        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest request =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.ACCEPTED, "Accepted");

        mockMvc.perform(patch("/api/v1/dispatch/assignments/10/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("X-User-Id", 42L)
                        .header("X-User-Role", "CUSTOMER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")));
    }
}
