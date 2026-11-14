package com.swiftdrop.order.controller;

import com.swiftdrop.order.dto.CityResponse;
import com.swiftdrop.order.dto.CreateOrderRequest;
import com.swiftdrop.order.dto.OrderResponse;
import com.swiftdrop.order.dto.QuoteRequest;
import com.swiftdrop.order.dto.QuoteResponse;
import com.swiftdrop.order.dto.ReceiptResponse;
import com.swiftdrop.order.dto.StatusChangeResponse;
import com.swiftdrop.order.dto.TimelineResponse;
import com.swiftdrop.order.dto.UpdateStatusRequest;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.pricing.PriceQuote;
import com.swiftdrop.order.pricing.PricingService;
import com.swiftdrop.order.security.AuthenticatedUser;
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
import org.springframework.web.bind.annotation.PatchMapping;
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
 * Customer order endpoints, reachable on every path a caller can end up with:
 * <ul>
 *   <li>{@code /api/v1/orders/...}: directly, or through the gateway when it strips fewer segments;</li>
 *   <li>{@code /orders/...}: when the gateway strips two segments;</li>
 *   <li>{@code /...}: what the gateway actually forwards today. Its order route is
 *       {@code /api/v1/orders/**} with {@code StripPrefix=3}, which removes {@code api}, {@code v1} AND
 *       {@code orders}, so {@code POST /api/v1/orders} arrives as {@code POST /} and
 *       {@code GET /api/v1/orders/cities} as {@code GET /cities}.</li>
 * </ul>
 *
 * <p>The customer id always comes from the verified JWT, never from the request.
 */
@RestController
@Validated
@RequestMapping({"/api/v1/orders", "/orders", "/"})
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

    @GetMapping("/{id}/timeline")
    @Operation(summary = "The delivery status timeline of one of the caller's own orders",
            description = "Every status the order has had, oldest first, with notes and locations. "
                    + "Someone else's order returns 404.")
    public ResponseEntity<TimelineResponse> timeline(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = CUSTOMER_ID_HEADER_DOC)
            @RequestHeader(value = "X-Customer-Id", required = false)
            @Pattern(regexp = CUSTOMER_ID_PATTERN) String customerIdHeader,
            @PathVariable Long id) {
        long customerId = customerIds.resolve(jwt, customerIdHeader);
        return ResponseEntity.ok(orderService.getTimeline(customerId, id));
    }

    @GetMapping("/{id}/receipt")
    @Operation(summary = "Receipt data for one of the caller's own orders",
            description = "The fee breakdown and order details exactly as charged when the order was placed. "
                    + "Someone else's order returns 404.")
    public ResponseEntity<ReceiptResponse> receipt(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = CUSTOMER_ID_HEADER_DOC)
            @RequestHeader(value = "X-Customer-Id", required = false)
            @Pattern(regexp = CUSTOMER_ID_PATTERN) String customerIdHeader,
            @PathVariable Long id) {
        long customerId = customerIds.resolve(jwt, customerIdHeader);
        return ResponseEntity.ok(orderService.getReceipt(customerId, id));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Move an order to its next delivery status (couriers and staff)",
            description = "Allowed moves: CREATED to PICKED_UP, PICKED_UP to IN_TRANSIT, IN_TRANSIT to "
                    + "OUT_FOR_DELIVERY, OUT_FOR_DELIVERY to DELIVERED, and any non-final status to FAILED. "
                    + "Anything else returns 422. Requires a courier/staff role, not CUSTOMER.")
    public ResponseEntity<StatusChangeResponse> changeStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest request) {
        // With authentication off (testing) there is no token, so the change is recorded as made by the system.
        Long actorId = jwt == null ? null : AuthenticatedUser.requireUserId(jwt);
        return ResponseEntity.ok(orderService.changeStatus(id, request.status(), request.note(), request.location(), actorId));
    }
}
