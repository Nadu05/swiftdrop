package com.swiftdrop.identity.controller;

import com.swiftdrop.identity.dto.OAuthClientProvisionRequest;
import com.swiftdrop.identity.dto.OAuthClientProvisionedResponse;
import com.swiftdrop.identity.dto.OAuthClientResponse;
import com.swiftdrop.identity.dto.OAuthCredentialHistoryResponse;
import com.swiftdrop.identity.entity.User;
import com.swiftdrop.identity.repository.UserRepository;
import com.swiftdrop.identity.service.MerchantOAuthClientService;
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
import java.util.Map;

@RestController
@Tag(name = "Merchant OAuth 2.0 Credentials", description = "OAuth 2.0 Client Credentials provisioning, rotation, scope management, and revocation")
public class MerchantOAuthClientController {

    private final MerchantOAuthClientService oauthClientService;
    private final UserRepository userRepository;

    public MerchantOAuthClientController(
            MerchantOAuthClientService oauthClientService,
            UserRepository userRepository) {
        this.oauthClientService = oauthClientService;
        this.userRepository = userRepository;
    }

    // ─── Admin Endpoints ──────────────────────────────────────────────────────

    @PostMapping({"/api/v1/admin/oauth-clients/provision", "/admin/oauth-clients/provision"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Provision a new OAuth 2.0 client for an approved merchant (secret returned once)")
    public ResponseEntity<OAuthClientProvisionedResponse> provisionForMerchant(
            @Valid @RequestBody OAuthClientProvisionRequest request,
            Authentication auth) {
        String actor = auth != null ? auth.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(oauthClientService.provisionClient(request, actor));
    }

    @GetMapping({"/api/v1/admin/oauth-clients/merchant/{merchantId}", "/admin/oauth-clients/merchant/{merchantId}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "List OAuth 2.0 clients for a specific merchant")
    public ResponseEntity<List<OAuthClientResponse>> listForMerchant(@PathVariable String merchantId) {
        return ResponseEntity.ok(oauthClientService.listByMerchant(merchantId));
    }

    @GetMapping({"/api/v1/admin/oauth-clients/merchant/{merchantId}/history", "/admin/oauth-clients/merchant/{merchantId}/history"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "View credential audit history for a specific merchant")
    public ResponseEntity<List<OAuthCredentialHistoryResponse>> historyForMerchant(@PathVariable String merchantId) {
        return ResponseEntity.ok(oauthClientService.listHistoryByMerchant(merchantId));
    }

    @PutMapping({"/api/v1/admin/oauth-clients/{id}/scopes", "/admin/oauth-clients/{id}/scopes"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Update authorized OAuth scopes for a merchant client")
    public ResponseEntity<OAuthClientResponse> updateScopes(
            @PathVariable Long id,
            @RequestBody Map<String, List<String>> body,
            Authentication auth) {
        List<String> scopes = body != null ? body.get("scopes") : List.of();
        String actor = auth != null ? auth.getName() : "admin";
        return ResponseEntity.ok(oauthClientService.updateScopes(id, scopes, actor));
    }

    @PostMapping({"/api/v1/admin/oauth-clients/{id}/revoke", "/admin/oauth-clients/{id}/revoke"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Revoke a specific OAuth 2.0 client")
    public ResponseEntity<OAuthClientResponse> revokeAsAdmin(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String reason = body != null ? body.get("reason") : "Revoked by administrator";
        String actor = auth != null ? auth.getName() : "admin";
        return ResponseEntity.ok(oauthClientService.revokeClient(id, reason, null, true, actor));
    }

    @PostMapping({"/api/v1/admin/oauth-clients/merchant/{merchantId}/revoke-all", "/admin/oauth-clients/merchant/{merchantId}/revoke-all"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
    @Operation(summary = "Revoke all active OAuth 2.0 clients for a suspended/terminated merchant")
    public ResponseEntity<Map<String, Object>> revokeAllForMerchant(
            @PathVariable String merchantId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String reason = body != null ? body.get("reason") : "Merchant suspended or terminated";
        String actor = auth != null ? auth.getName() : "admin";
        int revokedCount = oauthClientService.revokeAllForMerchant(merchantId, reason, actor);
        return ResponseEntity.ok(Map.of("merchantId", merchantId, "revokedCount", revokedCount));
    }

    // ─── Merchant Self-Service Endpoints ──────────────────────────────────────

    @GetMapping({"/api/v1/merchants/oauth-clients/my", "/merchants/oauth-clients/my"})
    @PreAuthorize("hasRole('MERCHANT')")
    @Operation(summary = "List OAuth 2.0 client metadata for the authenticated merchant")
    public ResponseEntity<List<OAuthClientResponse>> listMyClients(Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        String merchantId = requireMerchantOrganizationId(user);
        return ResponseEntity.ok(oauthClientService.listByMerchant(merchantId));
    }

    @GetMapping({"/api/v1/merchants/oauth-clients/my/history", "/merchants/oauth-clients/my/history"})
    @PreAuthorize("hasRole('MERCHANT')")
    @Operation(summary = "View credential audit history for the authenticated merchant")
    public ResponseEntity<List<OAuthCredentialHistoryResponse>> listMyHistory(Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        String merchantId = requireMerchantOrganizationId(user);
        return ResponseEntity.ok(oauthClientService.listHistoryByMerchant(merchantId));
    }

    @PostMapping({"/api/v1/merchants/oauth-clients/{id}/rotate", "/merchants/oauth-clients/{id}/rotate"})
    @PreAuthorize("hasRole('MERCHANT')")
    @Operation(summary = "Rotate client secret for an owned OAuth 2.0 client (new secret returned once)")
    public ResponseEntity<OAuthClientProvisionedResponse> rotateMyClient(
            @PathVariable Long id,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        String merchantId = requireMerchantOrganizationId(user);
        return ResponseEntity.ok(oauthClientService.rotateClientSecret(id, merchantId, false, user.getEmail()));
    }

    @PostMapping({"/api/v1/merchants/oauth-clients/{id}/revoke", "/merchants/oauth-clients/{id}/revoke"})
    @PreAuthorize("hasRole('MERCHANT')")
    @Operation(summary = "Revoke an owned OAuth 2.0 client")
    public ResponseEntity<OAuthClientResponse> revokeMyClient(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        String merchantId = requireMerchantOrganizationId(user);
        String reason = body != null ? body.get("reason") : "Revoked by merchant";
        return ResponseEntity.ok(oauthClientService.revokeClient(id, reason, merchantId, false, user.getEmail()));
    }

    private User resolveAuthenticatedUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
    }

    private String requireMerchantOrganizationId(User user) {
        if (user.getOrganizationId() == null || user.getOrganizationId().isBlank()) {
            throw new AccessDeniedException("No approved merchant organization is associated with this account");
        }
        return user.getOrganizationId().trim();
    }
}
