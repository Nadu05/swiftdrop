package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchCredentialsResponse;
import com.swiftdrop.organization.dto.BranchPostalAreaResponse;
import com.swiftdrop.organization.dto.BranchPostalAreasUpdateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.dto.BranchUpdateRequest;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.security.OrganizationUserPrincipal;
import com.swiftdrop.organization.service.BranchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
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

    @GetMapping("/{id}/credentials")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Get Branch Manager credential status and email delivery status for a branch")
    public ResponseEntity<BranchCredentialsResponse> getCredentials(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.getCredentials(id));
    }

    @PostMapping("/{id}/credentials/resend")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Resend active Branch Manager temporary credentials to the branch email")
    public ResponseEntity<BranchCredentialsResponse> resendCredentials(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.resendCredentials(id));
    }

    @PostMapping("/{id}/credentials/reset")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Reset Branch Manager password and email the new temporary credentials")
    public ResponseEntity<BranchCredentialsResponse> resetCredentials(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.resetCredentials(id));
    }

    @PostMapping("/{id}/credentials/provision")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Provision a Branch Manager account for a legacy branch and email credentials")
    public ResponseEntity<BranchCredentialsResponse> provisionCredentials(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.provisionCredentials(id));
    }

    @GetMapping("/{id}/postal-areas")
    @Operation(summary = "Get active assigned Postal Areas for a branch")
    public ResponseEntity<List<BranchPostalAreaResponse>> getPostalAreas(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.getAssignedPostalAreas(id));
    }

    @PutMapping("/{id}/postal-areas")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Replace active assigned Postal Areas for a branch")
    public ResponseEntity<List<BranchPostalAreaResponse>> updatePostalAreas(
            @PathVariable Long id,
            @Valid @RequestBody BranchPostalAreasUpdateRequest request) {
        return ResponseEntity.ok(branchService.updatePostalAreas(id, request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Partially update a branch (including activate/deactivate)")
    public ResponseEntity<BranchResponse> update(@PathVariable Long id,
                                                 @Valid @RequestBody BranchUpdateRequest request,
                                                 Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof OrganizationUserPrincipal principal) {
            if (!principal.isGlobalAdmin() && !principal.canManageBranch(id)) {
                throw new AccessDeniedException("Branch manager can only update their assigned branch");
            }
        }
        return ResponseEntity.ok(branchService.update(id, request));
    }
}

