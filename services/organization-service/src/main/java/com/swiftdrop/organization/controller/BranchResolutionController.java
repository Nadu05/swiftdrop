package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
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
 * Determines the nearest eligible active branch for parcel pickup coordinates.
 *
 * <p>Dual-mapped to support:
 * <ul>
 *   <li>Direct access: {@code POST /api/v1/branches/resolve}</li>
 *   <li>Gateway forwarded access: {@code POST /branches/resolve}
 *       (via {@code /api/v1/organization/branches/resolve} with {@code StripPrefix=3})</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping({"/api/v1/branches/resolve", "/branches/resolve"})
@Tag(name = "Branch Resolution", description = "Automatic nearest branch selection for parcel pickup")
public class BranchResolutionController {

    private final BranchResolutionService resolutionService;

    public BranchResolutionController(BranchResolutionService resolutionService) {
        this.resolutionService = resolutionService;
    }

    @PostMapping
    @Operation(summary = "Resolve nearest eligible branch for pickup coordinates")
    public ResponseEntity<BranchResolutionResponse> resolveBranch(
            @Valid @RequestBody BranchResolutionRequest request) {
        BranchResolutionResponse response = resolutionService.resolveNearestBranch(request);
        return ResponseEntity.ok(response);
    }
}

