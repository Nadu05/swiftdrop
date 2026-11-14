package com.swiftdrop.order.controller;

import com.swiftdrop.order.dto.PublicTrackingResponse;
import com.swiftdrop.order.service.TrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public tracking: no login. Served at {@code /api/v1/tracking/{n}} (the contract path) and
 * {@code /api/v1/orders/tracking/{n}}, which is the path the existing gateway route
 * {@code /api/v1/orders/**} (StripPrefix=3) already forwards, so it works without any gateway change.
 * The shorter {@code /tracking/**} and {@code /orders/tracking/**} are the stripped forms.
 */
@RestController
@RequestMapping({"/api/v1/tracking", "/tracking", "/api/v1/orders/tracking", "/orders/tracking"})
@Tag(name = "Tracking", description = "Public parcel tracking (safe information only)")
public class TrackingController {

    private final TrackingService trackingService;

    public TrackingController(TrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @GetMapping("/{trackingNumber}")
    @Operation(summary = "Track a parcel by its tracking number (no login)",
            description = "Returns the current status and the delivery timeline only: no addresses, contact "
                    + "details, ids or fees. An unknown or malformed number returns 404.")
    public ResponseEntity<PublicTrackingResponse> track(@PathVariable String trackingNumber) {
        return ResponseEntity.ok()
                // The status changes as the parcel moves: browsers and proxies must always ask again.
                .cacheControl(CacheControl.noStore())
                .body(trackingService.track(trackingNumber));
    }
}
