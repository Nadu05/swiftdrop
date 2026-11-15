package com.swiftdrop.order.controller;

import com.swiftdrop.order.dto.ReadyForDispatchResponse;
import com.swiftdrop.order.service.DispatchQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The Order side of the dispatch contract: orders waiting for a courier. Mapped like the other order
 * endpoints ({@code /api/v1/orders}, {@code /orders} and the bare {@code /} the gateway forwards after
 * stripping three segments) so it works directly and behind the gateway.
 *
 * <p>The response contains recipient names, phones and addresses, so it needs a dispatch/staff role (see
 * {@code swiftdrop.security.dispatch-read-roles}); customers and anonymous callers are refused.
 */
@RestController
@Validated
@RequestMapping({"/api/v1/orders", "/orders", "/"})
@Tag(name = "Dispatch", description = "Orders ready for courier dispatch (staff and Dispatch service)")
public class DispatchOrderController {

    private final DispatchQueryService dispatchQuery;

    public DispatchOrderController(DispatchQueryService dispatchQuery) {
        this.dispatchQuery = dispatchQuery;
    }

    @GetMapping("/ready-for-dispatch")
    @Operation(summary = "Orders ready for a courier (status CREATED), oldest first",
            description = "Optional branchId filter and limit (1-200, default 50). Contains recipient contact "
                    + "details, so it is restricted to dispatch/staff roles.")
    public ResponseEntity<List<ReadyForDispatchResponse>> readyForDispatch(
            @RequestParam(required = false) @Positive Long branchId,
            @RequestParam(required = false) @Min(1) @Max(DispatchQueryService.MAX_LIMIT) Integer limit) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(dispatchQuery.readyForDispatch(branchId, limit));
    }
}
