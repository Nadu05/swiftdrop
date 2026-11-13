package com.swiftdrop.order.controller;

import com.swiftdrop.order.dto.CityResponse;
import com.swiftdrop.order.dto.CreateOrderRequest;
import com.swiftdrop.order.dto.OrderResponse;
import com.swiftdrop.order.dto.QuoteRequest;
import com.swiftdrop.order.dto.QuoteResponse;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.pricing.PriceQuote;
import com.swiftdrop.order.pricing.PricingService;
import com.swiftdrop.order.security.CustomerIdResolver;
import com.swiftdrop.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

/**
 * Customer order endpoints. Dual-mapped so it works both directly ({@code /api/v1/orders}) and behind
 * the gateway, which strips the first three path segments ({@code /orders}).
 *
 * <p>The customer id always comes from the verified JWT, never from the request.
 */
@RestController
@Validated
@RequestMapping({"/api/v1/orders", "/orders"})
@Tag(name = "Orders", description = "Customer delivery orders")
public class OrderController {

    private static final String ORDERS_PATH = "/api/v1/orders/";

    private static final String TOTAL_COUNT_HEADER = "X-Total-Count";
    private static final String CUSTOMER_ID_PATTERN = "^[0-9]{1,18}$";
    private static final String CUSTOMER_ID_HEADER_DOC =
            "Testing only: honoured just when authentication is disabled; ignored otherwise.";

    private final OrderService orderService;
    private final CustomerIdResolver customerIds;
    private final PricingService pricingService;
    private final CityDirectory cityDirectory;

    public OrderController(OrderService orderService, CustomerIdResolver customerIds,
                           PricingService pricingService, CityDirectory cityDirectory) {
        this.orderService = orderService;
        this.customerIds = customerIds;
        this.pricingService = pricingService;
        this.cityDirectory = cityDirectory;
    }

    @PostMapping("/quote")
    @Operation(summary = "Get the delivery fee before confirming",
            description = "Calculates the fee for a parcel between two supported towns without creating anything. "
                    + "Creating the order uses the same calculation, so the fee does not change between quote and "
                    + "order unless the tariff changes (send expectedFee when creating to detect that).")
    public ResponseEntity<QuoteResponse> quote(@Valid @RequestBody QuoteRequest request) {
        PriceQuote quote = pricingService.quote(
                request.pickupCity(), request.dropoffCity(), request.parcelSize(), request.weightKg());
        return ResponseEntity.ok(QuoteResponse.from(quote));
    }

    @GetMapping("/cities")
    @Operation(summary = "List the supported pickup and delivery towns",
            description = "Use the returned code as pickupCity / dropoffCity in quotes and orders.")
    public ResponseEntity<List<CityResponse>> cities() {
        return ResponseEntity.ok(cityDirectory.all().stream().map(CityResponse::from).toList());
    }

    @PostMapping
    @Operation(summary = "Create a delivery order",
            description = "Optional Idempotency-Key header makes retries safe: the same key returns the original order.")
    public ResponseEntity<OrderResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "Idempotency-Key", required = false)
            @Size(max = 64) @Pattern(regexp = "^[A-Za-z0-9_.:-]+$") String idempotencyKey,
            @Parameter(description = CUSTOMER_ID_HEADER_DOC)
            @RequestHeader(value = "X-Customer-Id", required = false)
            @Pattern(regexp = CUSTOMER_ID_PATTERN) String customerIdHeader,
            @Valid @RequestBody CreateOrderRequest request) {
        long customerId = customerIds.resolve(jwt, customerIdHeader);
        OrderResponse created = orderService.createOrder(customerId, request, idempotencyKey);
        return ResponseEntity.created(URI.create(ORDERS_PATH + created.id())).body(created);
    }

    @GetMapping
    @Operation(summary = "List the caller's own orders, newest first",
            description = "Returns a JSON array. Paging: page (from 0) and size (1-100, default 20). "
                    + "The total number of orders is in the X-Total-Count response header.")
    public ResponseEntity<List<OrderResponse>> list(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = CUSTOMER_ID_HEADER_DOC)
            @RequestHeader(value = "X-Customer-Id", required = false)
            @Pattern(regexp = CUSTOMER_ID_PATTERN) String customerIdHeader,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        long customerId = customerIds.resolve(jwt, customerIdHeader);
        Page<OrderResponse> result = orderService.listOrders(customerId, page, size);
        return ResponseEntity.ok()
                .header(TOTAL_COUNT_HEADER, String.valueOf(result.getTotalElements()))
                .body(result.getContent());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one of the caller's own orders")
    public ResponseEntity<OrderResponse> getById(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = CUSTOMER_ID_HEADER_DOC)
            @RequestHeader(value = "X-Customer-Id", required = false)
            @Pattern(regexp = CUSTOMER_ID_PATTERN) String customerIdHeader,
            @PathVariable Long id) {
        long customerId = customerIds.resolve(jwt, customerIdHeader);
        return ResponseEntity.ok(orderService.getOrder(customerId, id));
    }
}
