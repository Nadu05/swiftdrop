package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.CourierAvailabilityResponse;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.service.CourierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

/**
 * REST controller for querying courier availability and operational workload capacity.
 * Supports dual-mapping for both direct microservice access and API Gateway forwarded paths.
 */
@RestController
@RequestMapping({"/api/v1/dispatch/couriers", "/couriers"})
@Tag(name = "Dispatch Couriers", description = "Endpoints for retrieving courier availability and active workload metrics")
public class CourierController {

    private final CourierService courierService;

    public CourierController(CourierService courierService) {
        this.courierService = courierService;
    }

    @GetMapping("/availability")
    @Operation(summary = "Get courier availability list",
               description = "Returns couriers with optional status and branch filters along with eligibility and active workload metrics.")
    public ResponseEntity<List<CourierAvailabilityResponse>> getCourierAvailability(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long branchId) {

        CourierStatus courierStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                courierStatus = CourierStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid courier status filter: '" + status + "'. Allowed values: " +
                        Arrays.toString(CourierStatus.values()));
            }
        }

        List<CourierAvailabilityResponse> responses = courierService.getCourierAvailability(courierStatus, branchId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}/availability")
    @Operation(summary = "Get courier availability by courier ID",
               description = "Returns operational availability, active deliveries, max capacity, and assignment eligibility for a single courier.")
    public ResponseEntity<CourierAvailabilityResponse> getCourierAvailabilityById(@PathVariable Long id) {
        return ResponseEntity.ok(courierService.getCourierAvailabilityById(id));
    }
}

