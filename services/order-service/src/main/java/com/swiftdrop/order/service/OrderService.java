package com.swiftdrop.order.service;

import com.swiftdrop.order.dto.CreateOrderRequest;
import com.swiftdrop.order.dto.OrderResponse;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.messaging.OrderEventRecorder;
import com.swiftdrop.order.pricing.FeeCalculator;
import com.swiftdrop.order.pricing.FeeCalculator.FeeQuote;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.OrderStatusHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.RoundingMode;
import java.util.Optional;

/**
 * Order domain rules: creation, ownership-safe retrieval. Independent of HTTP so other entry points
 * (for example merchant order creation) can reuse the same rules.
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final int MAX_TRACKING_ATTEMPTS = 5;

    private final DeliveryOrderRepository orders;
    private final OrderStatusHistoryRepository history;
    private final FeeCalculator feeCalculator;
    private final TrackingNumberGenerator trackingNumbers;
    private final OrderEventRecorder eventRecorder;
    private final TransactionTemplate transactionTemplate;

    public OrderService(DeliveryOrderRepository orders,
                        OrderStatusHistoryRepository history,
                        FeeCalculator feeCalculator,
                        TrackingNumberGenerator trackingNumbers,
                        OrderEventRecorder eventRecorder,
                        PlatformTransactionManager transactionManager) {
        this.orders = orders;
        this.history = history;
        this.feeCalculator = feeCalculator;
        this.trackingNumbers = trackingNumbers;
        this.eventRecorder = eventRecorder;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Creates an order for {@code customerId} with status CREATED and its first history entry, in one
     * transaction. The fee is always computed here, never taken from the client.
     *
     * <p>When an {@code idempotencyKey} is supplied, repeating the request returns the original order
     * instead of creating a second one, including when two identical requests race: the loser hits the
     * unique constraint, and is answered from the winner's order in a fresh transaction.
     */
    public OrderResponse createOrder(long customerId, CreateOrderRequest request, String idempotencyKey) {
        if (idempotencyKey != null) {
            Optional<DeliveryOrder> existing = orders.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey);
            if (existing.isPresent()) {
                return OrderResponse.from(existing.get());
            }
        }
        try {
            return transactionTemplate.execute(status -> persistNewOrder(customerId, request, idempotencyKey));
        } catch (DataIntegrityViolationException ex) {
            if (idempotencyKey != null) {
                Optional<DeliveryOrder> winner = orders.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey);
                if (winner.isPresent()) {
                    return OrderResponse.from(winner.get());
                }
            }
            throw ex;
        }
    }

    /**
     * Returns the order only if it belongs to {@code customerId}. Someone else's order and a
     * non-existent order are indistinguishable (both 404) so ids cannot be probed.
     */
    @Transactional(readOnly = true)
    public OrderResponse getOrder(long customerId, long orderId) {
        return orders.findByIdAndCustomerId(orderId, customerId)
                .map(OrderResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    private OrderResponse persistNewOrder(long customerId, CreateOrderRequest request, String idempotencyKey) {
        FeeQuote fee = feeCalculator.calculate(request.parcelSize(), request.weightKg());

        DeliveryOrder order = new DeliveryOrder(customerId, allocateTrackingNumber());
        order.setPickupAddress(request.pickupAddress());
        order.setPickupContactName(request.pickupContactName());
        order.setPickupContactPhone(request.pickupContactPhone());
        order.setDropoffAddress(request.dropoffAddress());
        order.setDropoffContactName(request.dropoffContactName());
        order.setDropoffContactPhone(request.dropoffContactPhone());
        order.setParcelDescription(blankToNull(request.parcelDescription()));
        order.setParcelSize(request.parcelSize());
        order.setWeightKg(request.weightKg().setScale(2, RoundingMode.HALF_UP));
        order.setDeliveryInstructions(blankToNull(request.deliveryInstructions()));
        order.setDeliveryFee(fee.totalFee());
        order.setCurrency(fee.currency());
        order.setStatus(OrderStatus.CREATED);
        order.setIdempotencyKey(idempotencyKey);

        DeliveryOrder saved = orders.saveAndFlush(order);
        history.save(new OrderStatusHistory(saved, OrderStatus.CREATED, "Order created", null, customerId));
        // Same transaction as the order: the event exists if and only if the order committed.
        eventRecorder.recordOrderCreated(saved);

        // Only ids and the public tracking number are logged: never addresses or phone numbers.
        log.info("Order created: id={}, trackingNumber={}", saved.getId(), saved.getTrackingNumber());
        return OrderResponse.from(saved);
    }

    private String allocateTrackingNumber() {
        for (int attempt = 0; attempt < MAX_TRACKING_ATTEMPTS; attempt++) {
            String candidate = trackingNumbers.next();
            if (!orders.existsByTrackingNumber(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not allocate a unique tracking number");
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
