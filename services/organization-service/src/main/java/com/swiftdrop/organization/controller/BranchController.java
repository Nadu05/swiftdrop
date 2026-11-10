package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.dto.BranchUpdateRequest;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.service.BranchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for branch management operations.
 *
 * <p>Dual-mapped to support both direct service access ({@code /api/v1/branches})
 * and API Gateway routed access ({@code /branches}) where the Gateway strips
 * {@code /api/v1/organization} via {@code StripPrefix=3}.</p>
 *
 * <p><strong>Security note:</strong> These endpoints are currently unprotected.
 * Write operations (POST, PATCH) should be restricted to SYSTEM_ADMIN and BRANCH_ADMIN
 * roles once Spring Security and JWT validation are integrated by Member 01.
 * Read operations (GET) may be accessible to authenticated users of any role.</p>
 */
@RestController
@RequestMapping({"/api/v1/branches", "/branches"})
@Tag(name = "Branches", description = "Branch management endpoints")
public class BranchController {

    private final BranchService branchService;

    public BranchController(BranchService branchService) {
        this.branchService = branchService;
    }

    @PostMapping
    @Operation(summary = "Create a new branch")
    public ResponseEntity<BranchResponse> create(@Valid @RequestBody BranchCreateRequest request) {
        BranchResponse response = branchService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List all branches, optionally filtered by status")
    public ResponseEntity<List<BranchResponse>> findAll(
            @RequestParam(required = false) String status) {
        BranchStatus branchStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                branchStatus = BranchStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid status filter: '" + status + "'. Allowed values: ACTIVE, INACTIVE");
            }
        }
        return ResponseEntity.ok(branchService.findAll(branchStatus));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a branch by ID")
    public ResponseEntity<BranchResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.findById(id));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Partially update a branch (including activate/deactivate)")
    public ResponseEntity<BranchResponse> update(@PathVariable Long id,
                                                  @Valid @RequestBody BranchUpdateRequest request) {
        return ResponseEntity.ok(branchService.update(id, request));
    }
}

