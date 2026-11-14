package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.courier.AvailabilityUpdateRequest;
import com.swiftdrop.dispatch.dto.courier.CourierJobResponse;
import com.swiftdrop.dispatch.dto.courier.CourierProfileResponse;
import com.swiftdrop.dispatch.dto.courier.FailedDeliveryRequest;
import com.swiftdrop.dispatch.dto.courier.ProofOfDeliveryRequest;
import com.swiftdrop.dispatch.security.CurrentCourierResolver;
import com.swiftdrop.dispatch.service.CourierPortalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Courier portal endpoints: the signed-in courier's profile, availability, job list and delivery details.
 *
 * <p>Job status changes are NOT here: the courier UI uses {@code PATCH /api/v1/dispatch/assignments/{id}/status}
 * ({@link AssignmentController}).
 *
 * <p>Dual-mapped like the other dispatch endpoints. Identity comes from {@code X-User-Id} /
 * {@code X-User-Role} (see {@link CurrentCourierResolver}).
 */
@RestController
@RequestMapping({"/api/v1/dispatch/couriers/me", "/couriers/me"})
@Tag(name = "Courier Portal", description = "The signed-in courier's profile, availability and jobs")
public class CourierPortalController {

    private final CourierPortalService service;
    private final CurrentCourierResolver courierResolver;

    public CourierPortalController(CourierPortalService service, CurrentCourierResolver courierResolver) {
        this.service = service;
        this.courierResolver = courierResolver;
    }

    @GetMapping
    @Operation(summary = "The calling courier's profile and current workload")
    public ResponseEntity<CourierProfileResponse> getProfile(
            @RequestHeader(value = CurrentCourierResolver.USER_ID_HEADER, required = false) String userId,
            @RequestHeader(value = CurrentCourierResolver.USER_ROLE_HEADER, required = false) String role) {
        return noStore(service.getProfile(courierResolver.resolveCourierId(userId, role)));
    }

    @PatchMapping("/availability")
    @Operation(summary = "Go online (AVAILABLE) or offline (OFFLINE)")
    public ResponseEntity<CourierProfileResponse> setAvailability(
            @RequestHeader(value = CurrentCourierResolver.USER_ID_HEADER, required = false) String userId,
            @RequestHeader(value = CurrentCourierResolver.USER_ROLE_HEADER, required = false) String role,
            @Valid @RequestBody AvailabilityUpdateRequest request) {
        return noStore(service.setAvailability(courierResolver.resolveCourierId(userId, role), request.online()));
    }

    @GetMapping("/assignments")
    @Operation(summary = "The calling courier's jobs with pickup, recipient and parcel details, newest first",
            description = "ASSIGNED, ACCEPTED, IN_TRANSIT, DELIVERED, FAILED. limit 1-200, default 100.")
    public ResponseEntity<List<CourierJobResponse>> listJobs(
            @RequestHeader(value = CurrentCourierResolver.USER_ID_HEADER, required = false) String userId,
            @RequestHeader(value = CurrentCourierResolver.USER_ROLE_HEADER, required = false) String role,
            @RequestParam(required = false) Integer limit) {
        return noStore(service.listJobs(courierResolver.resolveCourierId(userId, role), limit));
    }

    @PutMapping("/assignments/{assignmentId}/proof-of-delivery")
    @Operation(summary = "Save proof of delivery for a job in transit",
            description = "Then send DELIVERED via PATCH /assignments/{id}/status.")
    public ResponseEntity<CourierJobResponse> proofOfDelivery(
            @RequestHeader(value = CurrentCourierResolver.USER_ID_HEADER, required = false) String userId,
            @RequestHeader(value = CurrentCourierResolver.USER_ROLE_HEADER, required = false) String role,
            @PathVariable Long assignmentId,
            @Valid @RequestBody ProofOfDeliveryRequest request) {
        Long courierId = courierResolver.resolveCourierId(userId, role);
        return noStore(service.recordProofOfDelivery(courierId, assignmentId, request));
    }

    @PutMapping("/assignments/{assignmentId}/failure-details")
    @Operation(summary = "Save why a job in transit could not be delivered",
            description = "Then send FAILED (reason as notes) via PATCH /assignments/{id}/status.")
    public ResponseEntity<CourierJobResponse> failureDetails(
            @RequestHeader(value = CurrentCourierResolver.USER_ID_HEADER, required = false) String userId,
            @RequestHeader(value = CurrentCourierResolver.USER_ROLE_HEADER, required = false) String role,
            @PathVariable Long assignmentId,
            @Valid @RequestBody FailedDeliveryRequest request) {
        Long courierId = courierResolver.resolveCourierId(userId, role);
        return noStore(service.recordFailureDetails(courierId, assignmentId, request));
    }

    /** Responses contain recipient contact details, so they must not be cached. */
    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
