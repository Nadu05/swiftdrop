package com.swiftdrop.order.service;

import com.swiftdrop.order.dto.ReceiptResponse;
import com.swiftdrop.order.dto.StatusChangeResponse;
import com.swiftdrop.order.dto.TimelineResponse;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.messaging.OrderEventRecorder;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Status change, timeline and receipt rules of {@link OrderService}, with the repositories mocked. */
@ExtendWith(MockitoExtension.class)
class OrderStatusServiceTest {

    private static final long CUSTOMER = 42L;
    private static final long ORDER_ID = 7L;

    @Mock private DeliveryOrderRepository orders;
    @Mock private OrderStatusHistoryRepository history;
    @Mock private PricingService pricing;
    @Mock private TrackingNumberGenerator trackingNumbers;
    @Mock private OrderEventRecorder eventRecorder;
    @Mock private PlatformTransactionManager transactionManager;

    private OrderService service;

    @BeforeEach
    void setUp() {
        service = new OrderService(orders, history, pricing, trackingNumbers, eventRecorder, transactionManager);
    }

    private static DeliveryOrder order(OrderStatus status) {
        DeliveryOrder order = new DeliveryOrder(CUSTOMER, "SD-261113-AAAA2222");
        ReflectionTestUtils.setField(order, "id", ORDER_ID);
        ReflectionTestUtils.setField(order, "createdAt", Instant.parse("2026-11-13T08:00:00Z"));
        ReflectionTestUtils.setField(order, "updatedAt", Instant.parse("2026-11-13T09:00:00Z"));
        order.setStatus(status);
        order.setPickupAddress("45 Galle Road, Colombo 03");
        order.setPickupContactName("Nuwan Pradeep");
        order.setDropoffAddress("12/4 Peradeniya Road, Kandy");
        order.setDropoffContactName("Ayesha Perera");
        order.setPickupCity("COLOMBO");
        order.setDropoffCity("KANDY");
        order.setParcelSize(ParcelSize.MEDIUM);
        order.setWeightKg(new BigDecimal("1.50"));
        order.setDistanceKm(new BigDecimal("94.34"));
        order.setBaseFee(new BigDecimal("500.00"));
        order.setWeightFee(new BigDecimal("50.00"));
        order.setDistanceFee(new BigDecimal("943.40"));
        order.setZoneSurcharge(new BigDecimal("200.00"));
        order.setDeliveryFee(new BigDecimal("1693.40"));
        order.setCurrency("LKR");
        return order;
    }

    private static OrderStatusHistory entry(DeliveryOrder order, OrderStatus status, String createdAt) {
        OrderStatusHistory entry = new OrderStatusHistory(order, status, "note " + status, "Colombo hub", 9L);
        ReflectionTestUtils.setField(entry, "createdAt", Instant.parse(createdAt));
        return entry;
    }

    // ------------------------------------------------------------------ changeStatus

    @Test
    @DisplayName("moves to the next status: updates the order, appends history and records the event")
    void changesStatus() {
        DeliveryOrder order = order(OrderStatus.CREATED);
        when(orders.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        when(orders.saveAndFlush(order)).thenReturn(order);

        StatusChangeResponse response = service.changeStatus(ORDER_ID, OrderStatus.PICKED_UP, "Picked up", "Colombo", 9L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PICKED_UP);
        ArgumentCaptor<OrderStatusHistory> saved = ArgumentCaptor.forClass(OrderStatusHistory.class);
        verify(history).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(OrderStatus.PICKED_UP);
        assertThat(saved.getValue().getNote()).isEqualTo("Picked up");
        assertThat(saved.getValue().getLocation()).isEqualTo("Colombo");
        assertThat(saved.getValue().getChangedBy()).isEqualTo(9L);
        verify(eventRecorder).recordStatusChanged(eq(order), eq(OrderStatus.CREATED), any(Instant.class));
        assertThat(response.previousStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(response.status()).isEqualTo(OrderStatus.PICKED_UP);
        assertThat(response.statusLabel()).isEqualTo("Picked Up");
        assertThat(response.trackingNumber()).isEqualTo("SD-261113-AAAA2222");
    }

    @Test
    @DisplayName("blank note and location are stored as null, and a system change has no actor")
    void blankNoteAndNoActor() {
        DeliveryOrder order = order(OrderStatus.PICKED_UP);
        when(orders.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        when(orders.saveAndFlush(order)).thenReturn(order);

        service.changeStatus(ORDER_ID, OrderStatus.IN_TRANSIT, "   ", "", null);

        ArgumentCaptor<OrderStatusHistory> saved = ArgumentCaptor.forClass(OrderStatusHistory.class);
        verify(history).save(saved.capture());
        assertThat(saved.getValue().getNote()).isNull();
        assertThat(saved.getValue().getLocation()).isNull();
        assertThat(saved.getValue().getChangedBy()).isNull();
    }

    @Test
    @DisplayName("a move that is not allowed is a business-rule error and changes nothing")
    void rejectsInvalidTransition() {
        DeliveryOrder order = order(OrderStatus.CREATED);
        when(orders.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.changeStatus(ORDER_ID, OrderStatus.DELIVERED, null, null, 9L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("CREATED")
                .hasMessageContaining("DELIVERED");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CREATED);
        verify(orders, never()).saveAndFlush(any());
        verifyNoInteractions(history, eventRecorder);
    }

    @Test
    @DisplayName("repeating the current status is rejected, so a retried request does not create a duplicate entry")
    void rejectsRepeatedStatus() {
        DeliveryOrder order = order(OrderStatus.PICKED_UP);
        when(orders.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.changeStatus(ORDER_ID, OrderStatus.PICKED_UP, null, null, 9L))
                .isInstanceOf(BusinessRuleException.class);
        verifyNoInteractions(history, eventRecorder);
    }

    @Test
    @DisplayName("a delivered order is final")
    void deliveredIsFinal() {
        DeliveryOrder order = order(OrderStatus.DELIVERED);
        when(orders.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.changeStatus(ORDER_ID, OrderStatus.FAILED, null, null, 9L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("can no longer change");
        verifyNoInteractions(history, eventRecorder);
    }

    @Test
    @DisplayName("an unknown order is a 404")
    void unknownOrder() {
        when(orders.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.changeStatus(99L, OrderStatus.PICKED_UP, null, null, 9L))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(history, eventRecorder);
    }

    // ------------------------------------------------------------------ timeline

    @Test
    @DisplayName("the timeline lists the owner's history, with labels, and no actor id")
    void timeline() {
        DeliveryOrder order = order(OrderStatus.PICKED_UP);
        when(orders.findByIdAndCustomerId(ORDER_ID, CUSTOMER)).thenReturn(Optional.of(order));
        when(history.findByOrderIdOrderByCreatedAtAscIdAsc(ORDER_ID)).thenReturn(List.of(
                entry(order, OrderStatus.CREATED, "2026-11-13T08:00:00Z"),
                entry(order, OrderStatus.PICKED_UP, "2026-11-13T09:00:00Z")));

        TimelineResponse response = service.getTimeline(CUSTOMER, ORDER_ID);

        assertThat(response.orderId()).isEqualTo(ORDER_ID);
        assertThat(response.currentStatus()).isEqualTo(OrderStatus.PICKED_UP);
        assertThat(response.currentStatusLabel()).isEqualTo("Picked Up");
        assertThat(response.events()).hasSize(2);
        assertThat(response.events().get(0).status()).isEqualTo(OrderStatus.CREATED);
        assertThat(response.events().get(1).statusLabel()).isEqualTo("Picked Up");
        assertThat(response.events().get(1).note()).isEqualTo("note PICKED_UP");
        assertThat(response.events().get(1).location()).isEqualTo("Colombo hub");
        assertThat(response.events().get(1).timestamp()).isEqualTo(Instant.parse("2026-11-13T09:00:00Z"));
    }

    @Test
    @DisplayName("another customer's order has no timeline: 404, and its history is never read")
    void timelineOfSomeoneElse() {
        when(orders.findByIdAndCustomerId(ORDER_ID, 5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getTimeline(5L, ORDER_ID)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(history);
    }

    // ------------------------------------------------------------------ receipt

    @Test
    @DisplayName("the receipt shows the stored fee breakdown and details")
    void receipt() {
        DeliveryOrder order = order(OrderStatus.IN_TRANSIT);
        when(orders.findByIdAndCustomerId(ORDER_ID, CUSTOMER)).thenReturn(Optional.of(order));
        when(history.findByOrderIdOrderByCreatedAtAscIdAsc(ORDER_ID)).thenReturn(List.of(
                entry(order, OrderStatus.CREATED, "2026-11-13T08:00:00Z")));

        ReceiptResponse receipt = service.getReceipt(CUSTOMER, ORDER_ID);

        assertThat(receipt.trackingNumber()).isEqualTo("SD-261113-AAAA2222");
        assertThat(receipt.totalFee()).isEqualByComparingTo("1693.40");
        assertThat(receipt.feeBreakdown().baseFee()).isEqualByComparingTo("500.00");
        assertThat(receipt.feeBreakdown().weightFee()).isEqualByComparingTo("50.00");
        assertThat(receipt.feeBreakdown().distanceFee()).isEqualByComparingTo("943.40");
        assertThat(receipt.feeBreakdown().zoneSurcharge()).isEqualByComparingTo("200.00");
        assertThat(receipt.feeBreakdown().totalFee()).isEqualByComparingTo(receipt.totalFee());
        assertThat(receipt.currency()).isEqualTo("LKR");
        assertThat(receipt.orderedAt()).isEqualTo(Instant.parse("2026-11-13T08:00:00Z"));
        assertThat(receipt.pickupCity()).isEqualTo("COLOMBO");
        assertThat(receipt.dropoffContactName()).isEqualTo("Ayesha Perera");
        assertThat(receipt.deliveredAt()).as("not delivered yet").isNull();
        verifyNoInteractions(pricing);
    }

    @Test
    @DisplayName("a delivered order's receipt carries the delivery time")
    void receiptDeliveredAt() {
        DeliveryOrder order = order(OrderStatus.DELIVERED);
        when(orders.findByIdAndCustomerId(ORDER_ID, CUSTOMER)).thenReturn(Optional.of(order));
        when(history.findByOrderIdOrderByCreatedAtAscIdAsc(ORDER_ID)).thenReturn(List.of(
                entry(order, OrderStatus.CREATED, "2026-11-13T08:00:00Z"),
                entry(order, OrderStatus.DELIVERED, "2026-11-14T12:30:00Z")));

        assertThat(service.getReceipt(CUSTOMER, ORDER_ID).deliveredAt()).isEqualTo(Instant.parse("2026-11-14T12:30:00Z"));
    }

    @Test
    @DisplayName("another customer's receipt is a 404")
    void receiptOfSomeoneElse() {
        when(orders.findByIdAndCustomerId(ORDER_ID, 5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getReceipt(5L, ORDER_ID)).isInstanceOf(ResourceNotFoundException.class);
    }
}
