package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.MerchantRegistrationRequest;
import com.swiftdrop.organization.dto.MerchantRejectionRequest;
import com.swiftdrop.organization.dto.MerchantResponse;
import com.swiftdrop.organization.dto.MerchantSuspensionRequest;
import com.swiftdrop.organization.dto.MerchantUpdateRequest;
import com.swiftdrop.organization.entity.enums.MerchantStatus;
import com.swiftdrop.organization.service.MerchantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for merchant organization registration and approval.
 *
 * <p>Dual-mapped for direct access ({@code /api/v1/merchants}) and API Gateway access
 * ({@code /api/v1/organization/merchants/**} &rarr; {@code /merchants/**} via {@code StripPrefix=3}).</p>
 *
 * <p><strong>SECURITY WARNING &ndash; NOT PRODUCTION-SAFE:</strong> Spring Security / JWT validation is
 * not implemented in any SwiftDrop service yet. Every endpoint here, including the privileged
 * approve/reject/suspend/reactivate commands, is currently callable without authentication.
 * Intended roles are documented per endpoint and must be enforced from verified token claims once
 * the Identity Service contract (Member 01) is available. Client-supplied headers such as
 * {@code X-User-Role} are never trusted.</p>
 */
@RestController
@RequestMapping({"/api/v1/merchants", "/merchants"})
@Tag(name = "Merchants", description = "Merchant organization registration and approval (UNSECURED – auth pending)")
public class MerchantController {

    private final MerchantService merchantService;

    public MerchantController(MerchantService merchantService) {
        this.merchantService = merchantService;
    }

    /** Intended role: authenticated MERCHANT user (identity derived from token in future). */
    @PostMapping
    @Operation(summary = "Register a merchant organization (starts as PENDING) – intended role: MERCHANT")
    public ResponseEntity<MerchantResponse> register(@Valid @RequestBody MerchantRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(merchantService.register(request));
    }

    /** Intended role: SYSTEM_ADMIN / reviewing administrators. */
    @GetMapping
    @Operation(summary = "List merchants, optionally filtered by status – intended role: SYSTEM_ADMIN")
    public ResponseEntity<List<MerchantResponse>> findAll(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(merchantService.findAll(parseStatus(status)));
    }

    /** Intended role: SYSTEM_ADMIN / reviewing administrators. */
    @GetMapping("/pending")
    @Operation(summary = "List PENDING merchant applications, oldest first – intended role: SYSTEM_ADMIN")
    public ResponseEntity<List<MerchantResponse>> findPending() {
        return ResponseEntity.ok(merchantService.findPendingApplications());
    }

    /** Intended role: the owning MERCHANT user, or SYSTEM_ADMIN. */
    @GetMapping("/by-user/{identityUserId}")
    @Operation(summary = "Get the merchant profile linked to an identity user – intended role: owner MERCHANT or SYSTEM_ADMIN")
    public ResponseEntity<MerchantResponse> findByIdentityUser(@PathVariable String identityUserId) {
        return ResponseEntity.ok(merchantService.findByIdentityUserId(identityUserId));
    }

    /** Intended role: owning MERCHANT, SYSTEM_ADMIN, or internal service (e.g. Order eligibility check). */
    @GetMapping("/{id}")
    @Operation(summary = "Get a merchant profile by ID – intended role: owner MERCHANT, SYSTEM_ADMIN or internal service")
    public ResponseEntity<MerchantResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(merchantService.findById(id));
    }

    /** Intended role: owning MERCHANT or SYSTEM_ADMIN. Never changes status. */
    @RequestMapping(value = "/{id}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @Operation(summary = "Update merchant business information (status is not editable) – intended role: owner MERCHANT or SYSTEM_ADMIN")
    public ResponseEntity<MerchantResponse> update(@PathVariable Long id,
                                                   @Valid @RequestBody MerchantUpdateRequest request) {
        return ResponseEntity.ok(merchantService.update(id, request));
    }

    /** Intended role: SYSTEM_ADMIN. PENDING → APPROVED. */
    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve a PENDING merchant application – intended role: SYSTEM_ADMIN")
    public ResponseEntity<MerchantResponse> approve(@PathVariable Long id) {
        return ResponseEntity.ok(merchantService.approve(id));
    }

    /** Intended role: SYSTEM_ADMIN. PENDING → REJECTED. */
    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject a PENDING merchant application with a reason – intended role: SYSTEM_ADMIN")
    public ResponseEntity<MerchantResponse> reject(@PathVariable Long id,
                                                   @Valid @RequestBody MerchantRejectionRequest request) {
        return ResponseEntity.ok(merchantService.reject(id, request.getReason()));
    }

    /** Intended role: SYSTEM_ADMIN. APPROVED → SUSPENDED. */
    @PostMapping("/{id}/suspend")
    @Operation(summary = "Suspend an APPROVED merchant with a reason – intended role: SYSTEM_ADMIN")
    public ResponseEntity<MerchantResponse> suspend(@PathVariable Long id,
                                                    @Valid @RequestBody MerchantSuspensionRequest request) {
        return ResponseEntity.ok(merchantService.suspend(id, request.getReason()));
    }

    /** Intended role: SYSTEM_ADMIN. SUSPENDED → APPROVED. */
    @PostMapping("/{id}/reactivate")
    @Operation(summary = "Reactivate a SUSPENDED merchant – intended role: SYSTEM_ADMIN")
    public ResponseEntity<MerchantResponse> reactivate(@PathVariable Long id) {
        return ResponseEntity.ok(merchantService.reactivate(id));
    }

    private static MerchantStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return MerchantStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid status filter: '" + status + "'. Allowed values: PENDING, APPROVED, REJECTED, SUSPENDED");
        }
    }
}

