package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.ServiceAreaCreateRequest;
import com.swiftdrop.organization.dto.ServiceAreaResponse;
import com.swiftdrop.organization.dto.ServiceAreaUpdateRequest;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import com.swiftdrop.organization.service.ServiceAreaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for branch service-area management.
 * Dual-mapped to support both direct service access ({@code /api/v1/service-areas})
 * and Gateway routed access ({@code /service-areas}) where {@code StripPrefix=3} is applied.
 */
@RestController
@RequestMapping({"/api/v1/service-areas", "/service-areas"})
@Tag(name = "Service Areas", description = "Branch geographic service area configuration")
public class ServiceAreaController {

    private final ServiceAreaService serviceAreaService;

    public ServiceAreaController(ServiceAreaService serviceAreaService) {
        this.serviceAreaService = serviceAreaService;
    }

    @PostMapping
    @Operation(summary = "Create a new branch service area")
    public ResponseEntity<ServiceAreaResponse> create(@Valid @RequestBody ServiceAreaCreateRequest request) {
        ServiceAreaResponse response = serviceAreaService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List all service areas, optionally filtered by status")
    public ResponseEntity<List<ServiceAreaResponse>> findAll(
            @RequestParam(required = false) String status) {
        ServiceAreaStatus areaStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                areaStatus = ServiceAreaStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid status filter: '" + status + "'. Allowed values: ACTIVE, INACTIVE");
            }
        }
        return ResponseEntity.ok(serviceAreaService.findAll(areaStatus));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a service area by ID")
    public ResponseEntity<ServiceAreaResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(serviceAreaService.findById(id));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Partially update a service area")
    public ResponseEntity<ServiceAreaResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ServiceAreaUpdateRequest request) {
        return ResponseEntity.ok(serviceAreaService.update(id, request));
    }
}

