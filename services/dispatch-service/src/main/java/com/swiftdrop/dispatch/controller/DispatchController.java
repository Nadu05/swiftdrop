package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import com.swiftdrop.dispatch.service.DispatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@Tag(name = "Dispatch Operations", description = "SwiftDrop Dispatch Service: Pickup Tasks, Branch Drop-Off, Courier Assignment, Last-Mile Delivery, POD, and Exception Decisions")
public class DispatchController {

    private final DispatchService dispatchService;

    public DispatchController(DispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    // -------------------------------------------------------------------------
    // 1. PICKUP OPERATIONS & BRANCH DROP-OFF
    // -------------------------------------------------------------------------

    @PostMapping({"/api/v1/dispatch/pickup-tasks", "/pickup-tasks"})
    @Operation(summary = "Create an operational courier pickup task for an eligible COURIER_PICKUP order")
    public ResponseEntity<PickupTaskDto> createPickupTask(
            @Valid @RequestBody CreateOperationalTaskRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dispatchService.createPickupTask(request, principal));
    }

    @GetMapping({"/api/v1/dispatch/pickup-tasks", "/pickup-tasks"})
    @Operation(summary = "List pickup tasks within the dispatcher's branch scope")
    public ResponseEntity<List<PickupTaskDto>> listPickupTasks(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.listPickupTasks(branchId, status, principal));
    }

    @PostMapping({"/api/v1/dispatch/branch-dropoff", "/branch-dropoff"})
    @Operation(summary = "Confirm direct branch drop-off parcel receipt without creating a courier pickup task")
    public ResponseEntity<PickupTaskDto> confirmBranchDropoff(
            @Valid @RequestBody BranchDropoffConfirmRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.confirmBranchDropoff(request, principal));
    }

    // -------------------------------------------------------------------------
    // 2. LAST-MILE DELIVERY JOBS
    // -------------------------------------------------------------------------

    @PostMapping({"/api/v1/dispatch/delivery-jobs", "/delivery-jobs"})
    @Operation(summary = "Create a last-mile delivery job for a parcel at its destination branch")
    public ResponseEntity<DeliveryJobDto> createDeliveryJob(
            @Valid @RequestBody CreateOperationalTaskRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dispatchService.createDeliveryJob(request, principal));
    }

    @GetMapping({
            "/api/v1/dispatch/delivery-jobs",
            "/delivery-jobs",
            "/api/v1/dispatch/deliveries",
            "/deliveries"
    })
    @Operation(summary = "List last-mile delivery jobs within the dispatcher's branch scope")
    public ResponseEntity<List<DeliveryJobDto>> listDeliveryJobs(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.listDeliveryJobs(branchId, status, principal));
    }

    @GetMapping({"/api/v1/dispatch/deliveries/unassigned", "/deliveries/unassigned"})
    @Operation(summary = "List unassigned last-mile delivery jobs ready for courier dispatch")
    public ResponseEntity<List<DeliveryJobDto>> listUnassignedDeliveries(
            @RequestParam(required = false) Long branchId,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.listDeliveryJobs(branchId, "UNASSIGNED", principal));
    }

    // -------------------------------------------------------------------------
    // 3. COURIER FLEET, AVAILABILITY & WORKLOAD
    // -------------------------------------------------------------------------

    @GetMapping({"/api/v1/dispatch/couriers", "/couriers"})
    @Operation(summary = "List couriers and their live database workload within branch scope")
    public ResponseEntity<List<CourierProfileDto>> listCouriers(
            @RequestParam(required = false) Long branchId,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.listCouriers(branchId, principal));
    }

    @GetMapping({"/api/v1/dispatch/couriers/availability", "/couriers/availability"})
    @Operation(summary = "List courier availability and task eligibility for assignment")
    public ResponseEntity<List<CourierProfileDto>> getCourierAvailability(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String orderId,
            @RequestParam(required = false) BigDecimal weightKg,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.getAvailableCouriers(branchId, orderId, weightKg, principal));
    }

    @GetMapping({
            "/api/v1/dispatch/couriers/{courierId}/workload",
            "/couriers/{courierId}/workload"
    })
    @Operation(summary = "Retrieve live workload and active assignments for a specific courier")
    public ResponseEntity<CourierProfileDto> getCourierWorkload(
            @PathVariable String courierId,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.getCourierWorkload(courierId, principal));
    }

    // -------------------------------------------------------------------------
    // 4. COURIER SELF-SERVICE PORTAL (/couriers/me/**)
    // -------------------------------------------------------------------------

    @GetMapping({"/api/v1/dispatch/couriers/me", "/couriers/me"})
    @Operation(summary = "Retrieve the authenticated courier's operational profile and workload")
    public ResponseEntity<CourierProfileDto> getMyCourierProfile(
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.getMyCourierProfile(principal));
    }

    @PatchMapping({"/api/v1/dispatch/couriers/me/availability", "/couriers/me/availability"})
    @Operation(summary = "Update the authenticated courier's online/availability status")
    public ResponseEntity<CourierProfileDto> updateMyAvailability(
            @RequestBody CourierAvailabilityUpdateRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.updateMyAvailability(request, principal));
    }

    @GetMapping({"/api/v1/dispatch/couriers/me/assignments", "/couriers/me/assignments"})
    @Operation(summary = "List tasks and delivery jobs assigned to the authenticated courier")
    public ResponseEntity<List<DeliveryJobDto>> getMyCourierAssignments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.getMyCourierJobs(status, from, to, principal));
    }

    @GetMapping({"/api/v1/dispatch/couriers/me/summary", "/couriers/me/summary"})
    @Operation(summary = "Dashboard counters (assigned, pending, completed, failed) and workload for the authenticated courier")
    public ResponseEntity<CourierSummaryDto> getMyCourierSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.getMyCourierSummary(date, principal));
    }

    @GetMapping({"/api/v1/dispatch/couriers/me/assignments/{id}", "/couriers/me/assignments/{id}"})
    @Operation(summary = "Details of one delivery assigned to the authenticated courier (403 for another courier)")
    public ResponseEntity<DeliveryJobDto> getMyCourierAssignment(
            @PathVariable String id,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.getMyCourierJobDetail(id, principal));
    }

    @PostMapping(value = {
            "/api/v1/dispatch/couriers/me/assignments/{id}/pod-photo",
            "/couriers/me/assignments/{id}/pod-photo"
    }, consumes = "multipart/form-data")
    @Operation(summary = "Upload a proof-of-delivery photo; returns the evidence reference to send with /deliver")
    public ResponseEntity<java.util.Map<String, String>> uploadMyPodPhoto(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal DispatchUserPrincipal principal) throws IOException {
        String reference = dispatchService.storeCourierPodPhoto(id, file.getBytes(), file.getContentType(), principal);
        return ResponseEntity.ok(java.util.Map.of("photoEvidenceReference", reference));
    }

    @PostMapping({
            "/api/v1/dispatch/couriers/me/assignments/{id}/accept",
            "/couriers/me/assignments/{id}/accept"
    })
    @Operation(summary = "Courier accepts an assigned pickup or delivery task")
    public ResponseEntity<DeliveryJobDto> acceptMyAssignment(
            @PathVariable String id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.acceptAssignment(id, principal, idempotencyKey));
    }

    @PostMapping({
            "/api/v1/dispatch/couriers/me/assignments/{id}/pickup",
            "/couriers/me/assignments/{id}/pickup"
    })
    @Operation(summary = "Courier records parcel pickup from sender or departure from branch")
    public ResponseEntity<DeliveryJobDto> markMyAssignmentPickedUp(
            @PathVariable String id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.markPickedUp(id, principal, idempotencyKey));
    }

    @PostMapping({
            "/api/v1/dispatch/couriers/me/assignments/{id}/deliver",
            "/couriers/me/assignments/{id}/deliver"
    })
    @Operation(summary = "Courier completes delivery with Proof of Delivery (recipient name and signature/photo reference)")
    public ResponseEntity<DeliveryJobDto> completeMyDelivery(
            @PathVariable String id,
            @Valid @RequestBody ProofOfDeliveryRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.completeDelivery(id, request, principal, idempotencyKey));
    }

    @PostMapping({
            "/api/v1/dispatch/couriers/me/assignments/{id}/fail",
            "/couriers/me/assignments/{id}/fail"
    })
    @Operation(summary = "Courier reports a failed delivery attempt with structured reason (up to 3 attempts)")
    public ResponseEntity<DeliveryJobDto> reportMyFailedDelivery(
            @PathVariable String id,
            @Valid @RequestBody FailedDeliveryRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.recordFailedDelivery(id, request, principal, idempotencyKey));
    }

    // -------------------------------------------------------------------------
    // 5. COURIER ASSIGNMENTS, REASSIGNMENT & HISTORY
    // -------------------------------------------------------------------------

    @PostMapping({"/api/v1/dispatch/assignments", "/assignments"})
    @Operation(summary = "Create a new courier assignment for a pickup task or last-mile delivery job")
    public ResponseEntity<AssignmentRecordDto> createAssignment(
            @Valid @RequestBody AssignCourierRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dispatchService.assignCourier(request, principal));
    }

    @GetMapping({"/api/v1/dispatch/assignments", "/assignments"})
    @Operation(summary = "List courier assignments within branch scope")
    public ResponseEntity<List<AssignmentRecordDto>> listAssignments(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.listAssignments(branchId, status, principal));
    }

    @GetMapping({"/api/v1/dispatch/assignments/{id}", "/assignments/{id}"})
    @Operation(summary = "Retrieve a courier assignment by ID or assignment code")
    public ResponseEntity<AssignmentRecordDto> getAssignmentById(
            @PathVariable String id,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.getAssignmentById(id, principal));
    }

    @GetMapping({"/api/v1/dispatch/assignments/{id}/history", "/assignments/{id}/history"})
    @Operation(summary = "Retrieve chronological assignment & reassignment history for an assignment")
    public ResponseEntity<List<AssignmentRecordDto.AssignmentHistoryEntryDto>> getAssignmentHistory(
            @PathVariable String id,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.getAssignmentHistory(id, principal));
    }

    @PatchMapping({"/api/v1/dispatch/assignments/{id}", "/assignments/{id}"})
    @Operation(summary = "Reassign an active assignment to another eligible courier with reason")
    public ResponseEntity<AssignmentRecordDto> reassignCourierPatch(
            @PathVariable String id,
            @Valid @RequestBody ReassignCourierRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.reassignCourier(id, request, principal));
    }

    @PostMapping({"/api/v1/dispatch/assignments/{id}/reassign", "/assignments/{id}/reassign"})
    @Operation(summary = "Reassign an active assignment to another eligible courier with reason")
    public ResponseEntity<AssignmentRecordDto> reassignCourierPost(
            @PathVariable String id,
            @Valid @RequestBody ReassignCourierRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.reassignCourier(id, request, principal));
    }

    @PostMapping({"/api/v1/dispatch/assignments/{id}/accept", "/assignments/{id}/accept"})
    @Operation(summary = "Accept an assigned pickup or delivery task")
    public ResponseEntity<DeliveryJobDto> acceptAssignment(
            @PathVariable String id,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.acceptAssignment(id, principal));
    }

    @PostMapping({"/api/v1/dispatch/assignments/{id}/pickup", "/assignments/{id}/pickup"})
    @Operation(summary = "Record parcel collection or departure from branch")
    public ResponseEntity<DeliveryJobDto> markAssignmentPickedUp(
            @PathVariable String id,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.markPickedUp(id, principal));
    }

    @PostMapping({"/api/v1/dispatch/assignments/{id}/deliver", "/assignments/{id}/deliver"})
    @Operation(summary = "Record successful delivery with Proof of Delivery")
    public ResponseEntity<DeliveryJobDto> completeAssignmentDelivery(
            @PathVariable String id,
            @Valid @RequestBody ProofOfDeliveryRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.completeDelivery(id, request, principal));
    }

    @PostMapping({"/api/v1/dispatch/assignments/{id}/fail", "/assignments/{id}/fail"})
    @Operation(summary = "Record a failed delivery attempt with structured reason")
    public ResponseEntity<DeliveryJobDto> recordAssignmentFailure(
            @PathVariable String id,
            @Valid @RequestBody FailedDeliveryRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.recordFailedDelivery(id, request, principal));
    }

    // -------------------------------------------------------------------------
    // 6. DISPATCHER EXCEPTION DECISIONS (AFTER 3 FAILED ATTEMPTS)
    // -------------------------------------------------------------------------

    @GetMapping({"/api/v1/dispatch/exceptions", "/exceptions"})
    @Operation(summary = "List delivery exceptions requiring or having received dispatcher decisions")
    public ResponseEntity<List<DeliveryExceptionDto>> listExceptions(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.listExceptions(branchId, status, principal));
    }

    @PostMapping({
            "/api/v1/dispatch/exceptions/{id}/resolve",
            "/exceptions/{id}/resolve",
            "/api/v1/dispatch/exceptions/{id}/decision",
            "/exceptions/{id}/decision"
    })
    @Operation(summary = "Record a dispatcher decision for a delivery exception after 3 failed attempts")
    public ResponseEntity<DeliveryExceptionDto> resolveExceptionPost(
            @PathVariable String id,
            @Valid @RequestBody ExceptionDecisionRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.resolveException(id, request, principal));
    }

    @PatchMapping({"/api/v1/dispatch/exceptions/{id}", "/exceptions/{id}"})
    @Operation(summary = "Record a dispatcher decision for a delivery exception after 3 failed attempts")
    public ResponseEntity<DeliveryExceptionDto> resolveExceptionPatch(
            @PathVariable String id,
            @Valid @RequestBody ExceptionDecisionRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(dispatchService.resolveException(id, request, principal));
    }
}

