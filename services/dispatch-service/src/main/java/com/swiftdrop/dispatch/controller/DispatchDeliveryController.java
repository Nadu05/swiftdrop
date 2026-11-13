package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.UnassignedDeliveryResponse;
import com.swiftdrop.dispatch.service.UnassignedDeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for retrieving unassigned delivery orders awaiting courier dispatch.
 *
 * <p>Dual-mapped to support:
 * <ul>
 *   <li>Direct access: {@code GET /api/v1/dispatch/unassigned}</li>
 *   <li>Gateway forwarded access: {@code GET /unassigned}
 *       (via {@code /api/v1/dispatch/unassigned} with {@code StripPrefix=3})</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping({"/api/v1/dispatch/unassigned", "/unassigned"})
@Tag(name = "Dispatch Deliveries", description = "Endpoints for retrieving unassigned delivery orders for dispatch")
public class DispatchDeliveryController {

    private final UnassignedDeliveryService unassignedDeliveryService;

    public DispatchDeliveryController(UnassignedDeliveryService unassignedDeliveryService) {
        this.unassignedDeliveryService = unassignedDeliveryService;
    }

    @GetMapping
    @Operation(summary = "Get unassigned deliveries ready for courier assignment",
               description = "Retrieves orders eligible for dispatch from Order Service and excludes any orders that currently have active courier assignments.")
    public ResponseEntity<List<UnassignedDeliveryResponse>> getUnassignedDeliveries(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false, defaultValue = "50") Integer limit) {
        List<UnassignedDeliveryResponse> response = unassignedDeliveryService.getUnassignedDeliveries(branchId, limit);
        return ResponseEntity.ok(response);
    }
}

