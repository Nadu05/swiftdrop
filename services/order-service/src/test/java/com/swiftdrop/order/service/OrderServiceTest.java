package com.swiftdrop.order.service;

import com.swiftdrop.order.dto.CreateOrderRequest;
import com.swiftdrop.order.dto.OrderResponse;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.exception.PriceChangedException;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.location.City;
import com.swiftdrop.order.messaging.OrderEventRecorder;
import com.swiftdrop.order.pricing.FeeBreakdown;
import com.swiftdrop.order.pricing.PriceQuote;
import com.swiftdrop.order.pricing.PricingService;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.OrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    private static final long CUSTOMER = 42L;
    private static final City COLOMBO = new City("COLOMBO", "Colombo", "Colombo", 6.9271, 79.8612);
    private static final City KANDY = new City("KANDY", "Kandy", "Kandy", 7.2906, 80.6337);
    private static final FeeBreakdown FEE = new FeeBreakdown(new BigDecimal("500.00"), new BigDecimal("50.00"),
            new BigDecimal("943.40"), new BigDecimal("200.00"), new BigDecimal("1693.40"), "LKR");
    private static final PriceQuote PRICE = new PriceQuote(FEE, new BigDecimal("94.34"), COLOMBO, KANDY, true);

    @Mock private DeliveryOrderRepository orders;
    @Mock private OrderStatusHistoryRepository history;
    @Mock private PricingService pricing;
    @Mock private TrackingNumberGenerator trackingNumbers;
    @Mock private OrderEventRecorder eventRecorder;
    @Mock private PlatformTransactionManager transactionManager;

    private OrderService service;

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        service = new OrderService(orders, history, pricing, trackingNumbers, eventRecorder, transactionManager);
    }

    private static CreateOrderRequest request(BigDecimal expectedFee) {
        return new CreateOrderRequest(
                "45 Galle Road, Colombo 03", "Nuwan Pradeep", "+94771234567",
                "12/4 Peradeniya Road, Kandy", "Ayesha Perera", "+94718849201",
                "  ", ParcelSize.MEDIUM, new BigDecimal("1.5"), "",
                "COLOMBO", "KANDY", expectedFee);
    }

    private static CreateOrderRequest request() {
        return request(null);
    }

    private void stubPricing() {
        when(pricing.quote("COLOMBO", "KANDY", ParcelSize.MEDIUM, new BigDecimal("1.5"))).thenReturn(PRICE);
    }

    private void stubHappyPath() {
        stubPricing();
        when(trackingNumbers.next()).thenReturn("SD-261113-AAAA2222");
        when(orders.existsByTrackingNumber("SD-261113-AAAA2222")).thenReturn(false);
        when(orders.saveAndFlush(any(DeliveryOrder.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("creates the order with a server-side fee, CREATED status and a first history entry")
    void createsOrder() {
        stubHappyPath();

        OrderResponse response = service.createOrder(CUSTOMER, request(), null);

        ArgumentCaptor<DeliveryOrder> saved = ArgumentCaptor.forClass(DeliveryOrder.class);
        verify(orders).saveAndFlush(saved.capture());
        DeliveryOrder order = saved.getValue();
        assertThat(order.getCustomerId()).isEqualTo(CUSTOMER);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(order.getTrackingNumber()).isEqualTo("SD-261113-AAAA2222");
        assertThat(order.getWeightKg()).isEqualTo(new BigDecimal("1.50"));
        assertThat(order.getParcelDescription()).as("blank optional text is stored as null").isNull();
        assertThat(order.getDeliveryInstructions()).isNull();

        ArgumentCaptor<OrderStatusHistory> entry = ArgumentCaptor.forClass(OrderStatusHistory.class);
        verify(history).save(entry.capture());
        assertThat(entry.getValue().getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(entry.getValue().getChangedBy()).isEqualTo(CUSTOMER);
        verify(eventRecorder).recordOrderCreated(order);

        assertThat(response.trackingNumber()).isEqualTo("SD-261113-AAAA2222");
        assertThat(response.status()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    @DisplayName("stores the towns, distance and the full fee breakdown from the pricing service")
    void storesPricing() {
        stubHappyPath();

        OrderResponse response = service.createOrder(CUSTOMER, request(), null);

        ArgumentCaptor<DeliveryOrder> saved = ArgumentCaptor.forClass(DeliveryOrder.class);
        verify(orders).saveAndFlush(saved.capture());
        DeliveryOrder order = saved.getValue();
        assertThat(order.getPickupCity()).isEqualTo("COLOMBO");
        assertThat(order.getDropoffCity()).isEqualTo("KANDY");
        assertThat(order.getDistanceKm()).isEqualByComparingTo("94.34");
        assertThat(order.getDeliveryFee()).isEqualByComparingTo("1693.40");
        assertThat(order.getBaseFee()).isEqualByComparingTo("500.00");
        assertThat(order.getWeightFee()).isEqualByComparingTo("50.00");
        assertThat(order.getDistanceFee()).isEqualByComparingTo("943.40");
        assertThat(order.getZoneSurcharge()).isEqualByComparingTo("200.00");
        assertThat(order.getCurrency()).isEqualTo("LKR");

        assertThat(response.feeBreakdown().totalFee()).isEqualByComparingTo("1693.40");
        assertThat(response.pickupCity()).isEqualTo("COLOMBO");
    }

    @Test
    @DisplayName("an expectedFee equal to the calculated fee is accepted (compared by value: 1693.4 equals 1693.40)")
    void expectedFeeMatches() {
        stubHappyPath();

        OrderResponse response = service.createOrder(CUSTOMER, request(new BigDecimal("1693.4")), null);

        assertThat(response.deliveryFee()).isEqualByComparingTo("1693.40");
    }

    @Test
    @DisplayName("an expectedFee that differs from the calculated fee refuses the order and stores nothing")
    void expectedFeeMismatch() {
        stubPricing();

        assertThatThrownBy(() -> service.createOrder(CUSTOMER, request(new BigDecimal("1500.00")), null))
                .isInstanceOf(PriceChangedException.class);

        verify(orders, never()).saveAndFlush(any());
        verify(history, never()).save(any());
        verify(eventRecorder, never()).recordOrderCreated(any());
    }

    @Test
    @DisplayName("a pricing business-rule error (unsupported city, weight too heavy for the size) creates nothing")
    void pricingRejectsRequest() {
        when(pricing.quote(any(), any(), any(), any())).thenThrow(new BusinessRuleException("Unsupported city"));

        assertThatThrownBy(() -> service.createOrder(CUSTOMER, request(), null))
                .isInstanceOf(BusinessRuleException.class);

        verify(orders, never()).saveAndFlush(any());
        verify(eventRecorder, never()).recordOrderCreated(any());
    }

    @Test
    @DisplayName("a repeated request with the same idempotency key returns the original order and creates nothing")
    void idempotentReplay() {
        DeliveryOrder existing = new DeliveryOrder(CUSTOMER, "SD-261113-ORIG2222");
        existing.setDeliveryFee(new BigDecimal("725.00"));
        when(orders.findByCustomerIdAndIdempotencyKey(CUSTOMER, "key-1")).thenReturn(Optional.of(existing));

        OrderResponse response = service.createOrder(CUSTOMER, request(), "key-1");

        assertThat(response.trackingNumber()).isEqualTo("SD-261113-ORIG2222");
        verify(orders, never()).saveAndFlush(any());
        verify(history, never()).save(any());
        verify(eventRecorder, never()).recordOrderCreated(any());
        verify(pricing, never()).quote(any(), any(), any(), any());
    }

    @Test
    @DisplayName("losing an idempotency race returns the winner's order")
    void idempotencyRace() {
        DeliveryOrder winner = new DeliveryOrder(CUSTOMER, "SD-261113-WINN2222");
        when(orders.findByCustomerIdAndIdempotencyKey(CUSTOMER, "key-2"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(winner));
        stubPricing();
        when(trackingNumbers.next()).thenReturn("SD-261113-LOSE2222");
        when(orders.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_orders_customer_idempotency"));

        OrderResponse response = service.createOrder(CUSTOMER, request(), "key-2");

        assertThat(response.trackingNumber()).isEqualTo("SD-261113-WINN2222");
    }

    @Test
    @DisplayName("a constraint violation without an idempotency key is not swallowed")
    void violationWithoutKeyIsRethrown() {
        stubPricing();
        when(trackingNumbers.next()).thenReturn("SD-261113-AAAA2222");
        when(orders.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("boom"));

        assertThatThrownBy(() -> service.createOrder(CUSTOMER, request(), null))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("retries with a fresh tracking number when the first one is taken")
    void trackingNumberCollisionRetries() {
        stubPricing();
        when(trackingNumbers.next()).thenReturn("SD-261113-TAKEN222", "SD-261113-FREE2222");
        when(orders.existsByTrackingNumber("SD-261113-TAKEN222")).thenReturn(true);
        when(orders.existsByTrackingNumber("SD-261113-FREE2222")).thenReturn(false);
        when(orders.saveAndFlush(any(DeliveryOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderResponse response = service.createOrder(CUSTOMER, request(), null);

        assertThat(response.trackingNumber()).isEqualTo("SD-261113-FREE2222");
        verify(trackingNumbers, times(2)).next();
    }

    @Test
    @DisplayName("gives up after repeated tracking number collisions")
    void trackingNumberExhaustion() {
        stubPricing();
        when(trackingNumbers.next()).thenReturn("SD-261113-TAKEN222");
        when(orders.existsByTrackingNumber("SD-261113-TAKEN222")).thenReturn(true);

        assertThatThrownBy(() -> service.createOrder(CUSTOMER, request(), null))
                .isInstanceOf(IllegalStateException.class);
        verify(orders, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("another customer's order is reported as not found")
    void ownershipIsEnforced() {
        when(orders.findByIdAndCustomerId(7L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getOrder(99L, 7L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Order not found");
    }

    @Test
    @DisplayName("listing is scoped to the caller and uses a fixed newest-first sort that clients cannot change")
    void listsOnlyOwnOrdersNewestFirst() {
        DeliveryOrder order = new DeliveryOrder(CUSTOMER, "SD-261113-LIST2222");
        when(orders.findByCustomerId(eq(CUSTOMER), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(1, 5), 6));

        Page<OrderResponse> page = service.listOrders(CUSTOMER, 1, 5);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(orders).findByCustomerId(eq(CUSTOMER), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(5);
        assertThat(pageable.getValue().getSort())
                .isEqualTo(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        assertThat(page.getTotalElements()).isEqualTo(6);
        assertThat(page.getContent()).extracting(OrderResponse::trackingNumber).containsExactly("SD-261113-LIST2222");
    }

    @Test
    @DisplayName("the owner can read their order")
    void ownerCanRead() {
        DeliveryOrder order = new DeliveryOrder(CUSTOMER, "SD-261113-MINE2222");
        when(orders.findByIdAndCustomerId(7L, CUSTOMER)).thenReturn(Optional.of(order));

        assertThat(service.getOrder(CUSTOMER, 7L).trackingNumber()).isEqualTo("SD-261113-MINE2222");
    }
}
