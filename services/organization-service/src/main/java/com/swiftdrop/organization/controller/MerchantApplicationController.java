package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.*;
import com.swiftdrop.organization.security.OrganizationUserPrincipal;
import com.swiftdrop.organization.service.MerchantApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for merchant onboarding and Head Office Admin approval workflows.
 *
 * <p>Dual-mapped to support both direct service access ({@code /api/v1/merchants/applications})
 * and API Gateway routed access ({@code /merchants/applications}) where {@code StripPrefix=3}
 * strips {@code /api/v1/organization}.</p>
 */
@RestController
@RequestMapping({"/api/v1/merchants/applications", "/merchants/applications"})
@Tag(name = "Merchant Applications", description = "Merchant onboarding and Head Office approval endpoints")
public class MerchantApplicationController {

    private final MerchantApplicationService merchantApplicationService;

    public MerchantApplicationController(MerchantApplicationService merchantApplicationService) {
        this.merchantApplicationService = merchantApplicationService;
    }

    @PostMapping
    @Operation(summary = "Submit a new merchant onboarding application")
    public ResponseEntity<MerchantApplicationResponse> submitApplication(
            @Valid @RequestBody MerchantApplicationCreateRequest request,
            Authentication authentication) {
        String userId = extractUserId(authentication);
        String email = extractEmail(authentication);
        MerchantApplicationResponse response = merchantApplicationService.submitApplication(request, userId, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List merchant applications with optional filtering and sorting")
    public ResponseEntity<List<MerchantApplicationResponse>> findAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "newest") String sort) {
        return ResponseEntity.ok(merchantApplicationService.findAll(status, category, search, sort));
    }

    @GetMapping("/approved")
    @Operation(summary = "List approved registered merchants")
    public ResponseEntity<List<MerchantApplicationResponse>> findApprovedMerchants() {
        return ResponseEntity.ok(merchantApplicationService.findApprovedMerchants());
    }

    @GetMapping("/summary")
    @Operation(summary = "Get merchant approval summary metrics")
    public ResponseEntity<MerchantApprovalSummaryResponse> getSummaryMetrics() {
        return ResponseEntity.ok(merchantApplicationService.getSummaryMetrics());
    }

    @GetMapping("/my")
    @Operation(summary = "Get merchant applications submitted by the current authenticated user")
    public ResponseEntity<List<MerchantApplicationResponse>> findMyApplications(Authentication authentication) {
        String userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(merchantApplicationService.findByApplicantUserId(userId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get merchant application details by ID or application code")
    public ResponseEntity<MerchantApplicationResponse> findById(
            @PathVariable String id,
            Authentication authentication) {
        MerchantApplicationResponse response = merchantApplicationService.findByIdOrCode(id);
        if (!hasGlobalMerchantReadAccess(authentication)) {
            String callerEmail = extractEmail(authentication);
            String contactEmail = response.getContactPerson() != null ? response.getContactPerson().getEmail() : null;
            boolean emailMatch = callerEmail != null && contactEmail != null && callerEmail.equalsIgnoreCase(contactEmail);
            String callerId = extractUserId(authentication);
            boolean orgMatch = authentication != null
                    && authentication.getPrincipal() instanceof OrganizationUserPrincipal p
                    && p.organizationId() != null
                    && (p.organizationId().equalsIgnoreCase(response.getId())
                        || (response.getNumericId() != null && p.organizationId().equals(String.valueOf(response.getNumericId()))));
            if (!emailMatch && !orgMatch && (callerId == null || !callerId.equalsIgnoreCase(contactEmail))) {
                throw new AccessDeniedException("You do not have permission to view this merchant application");
            }
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Approve a merchant application (Head Office ADMIN only)")
    public ResponseEntity<MerchantApplicationResponse> approveApplication(
            @PathVariable String id,
            @RequestBody(required = false) MerchantApplicationApproveRequest request,
            Authentication authentication) {
        String adminEmail = extractEmail(authentication);
        String adminUserId = extractUserId(authentication);
        MerchantApplicationResponse response = merchantApplicationService.approveApplication(
                id, request, adminEmail, adminUserId
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Reject a merchant application with reason (Head Office ADMIN only)")
    public ResponseEntity<MerchantApplicationResponse> rejectApplication(
            @PathVariable String id,
            @Valid @RequestBody MerchantApplicationRejectRequest request,
            Authentication authentication) {
        String adminEmail = extractEmail(authentication);
        String adminUserId = extractUserId(authentication);
        MerchantApplicationResponse response = merchantApplicationService.rejectApplication(
                id, request, adminEmail, adminUserId
        );
        return ResponseEntity.ok(response);
    }

    private boolean hasGlobalMerchantReadAccess(Authentication authentication) {
        if (authentication == null) return false;
        if (authentication.getPrincipal() instanceof OrganizationUserPrincipal p && p.isGlobalAdmin()) {
            return true;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_ADMIN")
                        || a.equals("ROLE_HEAD_OFFICE_ADMIN")
                        || a.equals("ROLE_INTERNAL_SERVICE"));
    }

    private String extractUserId(Authentication authentication) {
        if (authentication == null) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof OrganizationUserPrincipal orgPrincipal) {
            return orgPrincipal.userId();
        }
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return authentication.getName();
    }

    private String extractEmail(Authentication authentication) {
        if (authentication == null) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof OrganizationUserPrincipal orgPrincipal) {
            return orgPrincipal.email();
        }
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return authentication.getName();
    }
}

