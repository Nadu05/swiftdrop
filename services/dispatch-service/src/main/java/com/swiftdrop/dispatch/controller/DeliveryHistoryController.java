package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.DeliveryHistoryEnvelope;
import com.swiftdrop.dispatch.dto.DeliveryHistoryResponse;
import com.swiftdrop.dispatch.dto.DeliveryHistorySummaryMetrics;
import com.swiftdrop.dispatch.service.DeliveryHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for retrieving completed and historical delivery assignments,
 * proof of delivery (POD), failure investigations, and summary analytics.
 * Dual-mapped to support both direct access and API Gateway forwarded paths.
 */
@RestController
@RequestMapping({"/api/v1/dispatch/history", "/history"})
@Tag(name = "Dispatch Delivery History", description = "Endpoints for completed delivery audit, POD, and dispatcher analytics")
public class DeliveryHistoryController {

    private final DeliveryHistoryService deliveryHistoryService;

    public DeliveryHistoryController(DeliveryHistoryService deliveryHistoryService) {
        this.deliveryHistoryService = deliveryHistoryService;
    }

    @GetMapping
    @Operation(summary = "Get delivery history with summary metrics and flexible filters",
               description = "Returns completed/failed deliveries along with calculated KPI metrics. Filterable by courier, branch, status, priority, and search query.")
    public ResponseEntity<DeliveryHistoryEnvelope> getDeliveryHistory(
            @RequestParam(required = false) Long courierId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search) {

        DeliveryHistoryEnvelope envelope = deliveryHistoryService.getDeliveryHistoryEnvelope(
                courierId, branchId, status, priority, search);
        return ResponseEntity.ok(envelope);
    }

    @GetMapping("/deliveries")
    @Operation(summary = "Get list of delivery history records only",
               description = "Returns only the list of completed and historical delivery records without the summary envelope.")
    public ResponseEntity<List<DeliveryHistoryResponse>> getDeliveryRecords(
            @RequestParam(required = false) Long courierId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search) {

        List<DeliveryHistoryResponse> records = deliveryHistoryService.getDeliveryHistoryRecords(
                courierId, branchId, status, priority, search);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/metrics")
    @Operation(summary = "Get summary metrics for delivery history",
               description = "Returns aggregate counts of total, successful, failed, and attempt metrics.")
    public ResponseEntity<DeliveryHistorySummaryMetrics> getMetrics(
            @RequestParam(required = false) Long courierId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search) {

        List<DeliveryHistoryResponse> records = deliveryHistoryService.getDeliveryHistoryRecords(
                courierId, branchId, status, priority, search);
        return ResponseEntity.ok(deliveryHistoryService.calculateMetrics(records));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get single delivery history record by assignment ID or assignment code",
               description = "Returns full details including proof of delivery, failure investigation, and audit timeline.")
    public ResponseEntity<DeliveryHistoryResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(deliveryHistoryService.getDeliveryHistoryById(id));
    }
}

