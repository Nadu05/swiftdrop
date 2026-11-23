package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.MerchantPickupLocationRequest;
import com.swiftdrop.organization.dto.MerchantPickupLocationResponse;
import com.swiftdrop.organization.security.OrganizationUserPrincipal;
import com.swiftdrop.organization.service.MerchantPickupLocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({ "/api/v1/merchants/pickup-locations", "/merchants/pickup-locations" })
@Tag(name = "Merchant Pickup Locations", description = "CRUD management for merchant saved pickup locations")
public class MerchantPickupLocationController {

    private final MerchantPickupLocationService pickupLocationService;

    public MerchantPickupLocationController(MerchantPickupLocationService pickupLocationService) {
        this.pickupLocationService = pickupLocationService;
    }

    @GetMapping
    @Operation(summary = "List saved pickup locations for the authenticated merchant")
    public ResponseEntity<List<MerchantPickupLocationResponse>> listMyLocations(Authentication authentication) {
        return ResponseEntity.ok(pickupLocationService.listForMerchant(
                extractOrganizationId(authentication),
                extractUserId(authentication)));
    }

    @PostMapping
    @Operation(summary = "Create a new saved pickup location for the authenticated merchant")
    public ResponseEntity<MerchantPickupLocationResponse> createLocation(
            @Valid @RequestBody MerchantPickupLocationRequest request,
            Authentication authentication) {
        MerchantPickupLocationResponse created = pickupLocationService.createLocation(
                request,
                extractOrganizationId(authentication),
                extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing saved pickup location")
    public ResponseEntity<MerchantPickupLocationResponse> updateLocation(
            @PathVariable Long id,
            @Valid @RequestBody MerchantPickupLocationRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(pickupLocationService.updateLocation(
                id,
                request,
                extractOrganizationId(authentication),
                extractUserId(authentication)));
    }

    @PatchMapping("/{id}/default")
    @Operation(summary = "Mark a saved pickup location as the default")
    public ResponseEntity<MerchantPickupLocationResponse> setDefaultLocation(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(pickupLocationService.setDefaultLocation(
                id,
                extractOrganizationId(authentication),
                extractUserId(authentication)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Activate or deactivate a saved pickup location")
    public ResponseEntity<MerchantPickupLocationResponse> toggleStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            Authentication authentication) {
        boolean active = body != null && Boolean.TRUE.equals(body.get("active"));
        return ResponseEntity.ok(pickupLocationService.toggleStatus(
                id,
                active,
                extractOrganizationId(authentication),
                extractUserId(authentication)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a saved pickup location")
    public ResponseEntity<Void> deleteLocation(
            @PathVariable Long id,
            Authentication authentication) {
        pickupLocationService.deleteLocation(
                id,
                extractOrganizationId(authentication),
                extractUserId(authentication));
        return ResponseEntity.noContent().build();
    }

    private String extractOrganizationId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof OrganizationUserPrincipal p) {
            return p.organizationId();
        }
        return null;
    }

    private String extractUserId(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof OrganizationUserPrincipal p) {
            return p.userId();
        }
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return authentication.getName();
    }
}

