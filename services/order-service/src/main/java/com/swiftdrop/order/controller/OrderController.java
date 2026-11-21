package com.swiftdrop.order.controller;

import com.swiftdrop.order.dto.*;
import com.swiftdrop.order.security.OrderUserPrincipal;
import com.swiftdrop.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@Tag(name = "Delivery Orders", description = "SwiftDrop Delivery Order, Pricing Quote, Lifecycle, and Public Tracking APIs")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping({"/api/v1/orders/quote", "/orders/quote", "/quote"})
    @Operation(summary = "Generate a configurable provisional delivery pricing quote and resolve origin/destination branches")
    public ResponseEntity<OrderQuoteResponse> generateQuote(
            @Valid @RequestBody OrderQuoteRequest request) {
        return ResponseEntity.ok(orderService.generateQuote(request));
    }

    @PostMapping({"/api/v1/orders", "/orders", "/", ""})
    @Operation(summary = "Create a new customer or merchant delivery order")
    public ResponseEntity<DeliveryOrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal OrderUserPrincipal principal) {
        DeliveryOrderResponse created = orderService.createOrder(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping({"/api/v1/orders", "/orders", "/", ""})
    @Operation(summary = "List delivery orders scoped by caller role (CUSTOMER, MERCHANT, DISPATCHER, ADMIN)")
    public ResponseEntity<List<DeliveryOrderResponse>> listOrders(
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal OrderUserPrincipal principal) {
        return ResponseEntity.ok(orderService.listOrders(principal, status));
    }

    @GetMapping({
            "/api/v1/orders/tracking/{trackingNumber}",
            "/orders/tracking/{trackingNumber}",
            "/tracking/{trackingNumber}",
            "/api/v1/tracking/{trackingNumber}"
    })
    @Operation(summary = "Retrieve safe public tracking timeline by tracking number (SD-XXXXX)")
    public ResponseEntity<PublicTrackingResponse> getPublicTracking(
            @PathVariable String trackingNumber) {
        return ResponseEntity.ok(orderService.getPublicTracking(trackingNumber));
    }

    @GetMapping({
            "/api/v1/orders/{id}",
            "/orders/{id}",
            "/{id}"
    })
    @Operation(summary = "Retrieve a specific delivery order by ID or tracking number")
    public ResponseEntity<DeliveryOrderResponse> getOrderById(
            @PathVariable String id,
            @AuthenticationPrincipal OrderUserPrincipal principal) {
        return ResponseEntity.ok(orderService.getOrderByIdOrTracking(id, principal));
    }

    @PatchMapping({
            "/api/v1/orders/{id}/status",
            "/orders/{id}/status",
            "/{id}/status"
    })
    @Operation(summary = "Transition parcel lifecycle status and append an immutable tracking event")
    public ResponseEntity<DeliveryOrderResponse> updateOrderStatus(
            @PathVariable String id,
            @Valid @RequestBody OrderStatusUpdateRequest request,
            @AuthenticationPrincipal OrderUserPrincipal principal) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, request, principal));
    }

    @PostMapping({
            "/api/v1/orders/{id}/branch-dropoff",
            "/orders/{id}/branch-dropoff",
            "/{id}/branch-dropoff"
    })
    @Operation(summary = "Record direct branch drop-off at origin branch (transitions to AT_ORIGIN_BRANCH without courier pickup assignment)")
    public ResponseEntity<DeliveryOrderResponse> recordBranchDropoff(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal OrderUserPrincipal principal) {
        String notes = body != null ? body.get("notes") : null;
        return ResponseEntity.ok(orderService.recordBranchDropoff(id, notes, principal));
    }

    @PostMapping({
            "/api/v1/orders/{id}/payment/confirm",
            "/orders/{id}/payment/confirm",
            "/{id}/payment/confirm"
    })
    @Operation(summary = "Verify and confirm a PREPAID payment reference for an order")
    public ResponseEntity<DeliveryOrderResponse> confirmPrepaidPayment(
            @PathVariable String id,
            @Valid @RequestBody PaymentConfirmationRequest request,
            @AuthenticationPrincipal OrderUserPrincipal principal) {
        return ResponseEntity.ok(orderService.confirmPrepaidPayment(id, request, principal));
    }

    @PostMapping({
            "/api/v1/orders/{id}/cancel",
            "/orders/{id}/cancel",
            "/{id}/cancel"
    })
    @Operation(summary = "Cancel a delivery order prior to pickup")
    public ResponseEntity<DeliveryOrderResponse> cancelOrder(
            @PathVariable String id,
            @RequestBody(required = false) OrderCancelRequest request,
            @AuthenticationPrincipal OrderUserPrincipal principal) {
        return ResponseEntity.ok(orderService.cancelOrder(id, request, principal));
    }
}

