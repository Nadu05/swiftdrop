package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
import com.swiftdrop.organization.dto.RouteBranchResolutionRequest;
import com.swiftdrop.organization.dto.RouteBranchResolutionResponse;
import com.swiftdrop.organization.service.BranchResolutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for automatic branch resolution.
 * Supports both single-coordinate pickup resolution and dual-coordinate
 * (origin + destination) route resolution.
 *
 * <p>Dual-mapped to support:
 * <ul>
 *   <li>Direct access: {@code POST /api/v1/branches/resolve} and {@code POST /api/v1/branches/resolve-route}</li>
 *   <li>Gateway forwarded access: {@code POST /branches/resolve} and {@code POST /branches/resolve-route}
 *       (via {@code /api/v1/organization/branches/**} with {@code StripPrefix=3})</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping({"/api/v1/branches", "/branches"})
@Tag(name = "Branch Resolution", description = "Automatic nearest branch selection for parcel pickup and destination")
public class BranchResolutionController {

    private final BranchResolutionService resolutionService;

    public BranchResolutionController(BranchResolutionService resolutionService) {
        this.resolutionService = resolutionService;
    }

    @PostMapping("/resolve")
    @Operation(summary = "Resolve nearest eligible branch for pickup coordinates")
    public ResponseEntity<BranchResolutionResponse> resolveBranch(
            @Valid @RequestBody BranchResolutionRequest request) {
        BranchResolutionResponse response = resolutionService.resolveNearestBranch(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/resolve-route", "/resolve/route"})
    @Operation(summary = "Resolve nearest eligible origin and destination branches for pickup and delivery coordinates")
    public ResponseEntity<RouteBranchResolutionResponse> resolveRoute(
            @Valid @RequestBody RouteBranchResolutionRequest request) {
        RouteBranchResolutionResponse response = resolutionService.resolveRoute(request);
        return ResponseEntity.ok(response);
    }
}
