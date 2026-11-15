package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.AssignmentHistoryResponse;
import com.swiftdrop.dispatch.dto.AssignmentReassignRequest;
import com.swiftdrop.dispatch.dto.AssignmentRequest;
import com.swiftdrop.dispatch.dto.AssignmentResponse;
import com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.exception.AccessDeniedException;
import com.swiftdrop.dispatch.exception.UnauthorizedException;
import com.swiftdrop.dispatch.service.AssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

/**
 * REST controller for courier assignment creation, retrieval, reassignment, and status management.
 * Supports dual-mapping for both direct microservice access and API Gateway forwarded paths.
 */
@RestController
@RequestMapping({"/api/v1/dispatch/assignments", "/assignments"})
@Tag(name = "Dispatch Assignments", description = "Endpoints for creating, querying, reassigning, and updating courier assignments")
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @PostMapping
    @Operation(summary = "Assign a courier to an order",
               description = "Validates courier availability, capacity, and active order status before assigning the order.")
    public ResponseEntity<AssignmentResponse> createAssignment(@Valid @RequestBody AssignmentRequest request) {
        AssignmentResponse response = assignmentService.createAssignment(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "List all assignments with optional filtering",
               description = "Supports filtering by courierId, branchId, status, and orderId.")
    public ResponseEntity<List<AssignmentResponse>> findAll(
            @RequestParam(required = false) Long courierId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long orderId) {

        AssignmentStatus assignmentStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                assignmentStatus = AssignmentStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid status filter: '" + status + "'. Allowed values: " +
                        Arrays.toString(AssignmentStatus.values()));
            }
        }

        List<AssignmentResponse> responses = assignmentService.findAll(courierId, branchId, assignmentStatus, orderId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/my-assignments")
    @Operation(summary = "Get assignments for the authenticated courier",
               description = "Resolves the authenticated user ID to the corresponding courier profile and returns assigned deliveries.")
    public ResponseEntity<List<AssignmentResponse>> getMyAssignments(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {
        if (headerUserId == null) {
            throw new UnauthorizedException("Authentication required: missing user identity");
        }
        List<AssignmentResponse> responses = assignmentService.findAssignmentsForCourierUser(headerUserId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get assignment details by ID")
    public ResponseEntity<AssignmentResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.findById(id));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get chronological audit history for an assignment")
    public ResponseEntity<List<AssignmentHistoryResponse>> getAssignmentHistory(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.findHistoryByAssignmentId(id));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Reassign an active assignment to a new courier",
               description = "Validates assignment status, acquires pessimistic lock on the new courier, verifies capacity, and records an audit log entry.")
    public ResponseEntity<AssignmentResponse> reassignCourier(
            @PathVariable Long id,
            @Valid @RequestBody AssignmentReassignRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {

        if (request.getChangedBy() == null && headerUserId != null) {
            request.setChangedBy(headerUserId);
        }

        AssignmentResponse response = assignmentService.reassignCourier(id, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update delivery status for an assignment",
               description = "Allows couriers or dispatchers to transition assignment status (ASSIGNED -> ACCEPTED -> IN_TRANSIT -> DELIVERED).")
    public ResponseEntity<AssignmentResponse> updateAssignmentStatus(
            @PathVariable Long id,
            @Valid @RequestBody AssignmentStatusUpdateRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "X-User-Role", required = false) String headerUserRole) {

        if (headerUserId == null) {
            throw new UnauthorizedException("Authentication required: missing user identity");
        }
        if (headerUserRole == null || headerUserRole.isBlank()) {
            throw new UnauthorizedException("Authentication required: missing user role");
        }

        String normalizedRole = headerUserRole.trim().toUpperCase();
        if (!"COURIER".equals(normalizedRole) && !"DISPATCHER".equals(normalizedRole) && !"ADMIN".equals(normalizedRole)) {
            throw new AccessDeniedException("Role '" + normalizedRole + "' is not authorized to update delivery status");
        }

        boolean isCourier = "COURIER".equals(normalizedRole);
        AssignmentResponse response = assignmentService.updateAssignmentStatus(id, request, headerUserId, isCourier);
        return ResponseEntity.ok(response);
    }
}
