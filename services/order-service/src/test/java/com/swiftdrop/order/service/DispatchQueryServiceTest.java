package com.swiftdrop.order.service;

import com.swiftdrop.order.dto.ReadyForDispatchResponse;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DispatchQueryServiceTest {

    @Mock private DeliveryOrderRepository orders;

    private DispatchQueryService service;

    @BeforeEach
    void setUp() {
        service = new DispatchQueryService(orders, new CityDirectory());
    }

    private static DeliveryOrder order(long id, String dropoffCity) {
        DeliveryOrder order = new DeliveryOrder(42L, "SD-261113-AAAA222" + id);
        ReflectionTestUtils.setField(order, "id", id);
        ReflectionTestUtils.setField(order, "createdAt", Instant.parse("2026-11-13T08:30:00Z"));
        order.setBranchId(3L);
        order.setPickupAddress("45 Galle Road, Colombo 03");
        order.setPickupContactName("Nuwan Pradeep");
        order.setPickupContactPhone("+94771234567");
        order.setDropoffAddress("12/4 Peradeniya Road, Kandy");
        order.setDropoffContactName("Ayesha Perera");
        order.setDropoffContactPhone("0718849201");
        order.setDeliveryInstructions("Call on arrival");
        order.setParcelSize(ParcelSize.MEDIUM);
        order.setWeightKg(new BigDecimal("1.50"));
        order.setDropoffCity(dropoffCity);
        order.setPickupCity("COLOMBO");
        return order;
    }

    @Test
    @DisplayName("maps an order to the fields Dispatch reads")
    void mapsFields() {
        when(orders.findByStatusOrderByCreatedAtAscIdAsc(eq(OrderStatus.CREATED), any(Pageable.class)))
                .thenReturn(List.of(order(1, "KANDY")));

        ReadyForDispatchResponse r = service.readyForDispatch(null, null).get(0);

        assertThat(r.id()).isEqualTo(1L);
        assertThat(r.trackingNumber()).isEqualTo("SD-261113-AAAA2221");
        assertThat(r.orderNumber()).isEqualTo(r.trackingNumber());
        assertThat(r.branchId()).isEqualTo(3L);
        assertThat(r.recipientName()).isEqualTo("Ayesha Perera");
        assertThat(r.recipientPhone()).isEqualTo("0718849201");
        assertThat(r.deliveryAddress()).isEqualTo("12/4 Peradeniya Road, Kandy");
        assertThat(r.city()).isEqualTo("Kandy");
        assertThat(r.merchantName()).isEqualTo("Nuwan Pradeep");
        assertThat(r.merchantContact()).isEqualTo("+94771234567");
        assertThat(r.priority()).isEqualTo("STANDARD");
        assertThat(r.packageType()).isEqualTo("MEDIUM");
        assertThat(r.weightKg()).isEqualTo(1.5);
        assertThat(r.dimensions()).isNull();
        assertThat(r.handlingNotes()).isEqualTo("Call on arrival");
        assertThat(r.createdAt()).isEqualTo(LocalDateTime.of(2026, 11, 13, 8, 30));
        assertThat(r.pickupAddress()).isEqualTo("45 Galle Road, Colombo 03");
        assertThat(r.pickupCity()).isEqualTo("Colombo");
    }

    @Test
    @DisplayName("an old order without a town has no city instead of failing")
    void oldOrderWithoutTown() {
        when(orders.findByStatusOrderByCreatedAtAscIdAsc(eq(OrderStatus.CREATED), any(Pageable.class)))
                .thenReturn(List.of(order(1, null)));

        assertThat(service.readyForDispatch(null, null).get(0).city()).isNull();
    }

    @Test
    @DisplayName("without a branch all branches are searched; the default limit is 50")
    void noBranchFilter() {
        when(orders.findByStatusOrderByCreatedAtAscIdAsc(eq(OrderStatus.CREATED), any(Pageable.class))).thenReturn(List.of());

        assertThat(service.readyForDispatch(null, null)).isEmpty();

        ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
        verify(orders).findByStatusOrderByCreatedAtAscIdAsc(eq(OrderStatus.CREATED), page.capture());
        assertThat(page.getValue().getPageNumber()).isZero();
        assertThat(page.getValue().getPageSize()).isEqualTo(50);
        verify(orders, never()).findByStatusAndBranchIdOrderByCreatedAtAscIdAsc(any(), any(), any());
    }

    @Test
    @DisplayName("with a branch only that branch is searched, and the limit is applied")
    void branchFilter() {
        when(orders.findByStatusAndBranchIdOrderByCreatedAtAscIdAsc(eq(OrderStatus.CREATED), eq(3L), any(Pageable.class)))
                .thenReturn(List.of(order(1, "KANDY"), order(2, "KANDY")));

        assertThat(service.readyForDispatch(3L, 10)).hasSize(2);

        ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
        verify(orders).findByStatusAndBranchIdOrderByCreatedAtAscIdAsc(eq(OrderStatus.CREATED), eq(3L), page.capture());
        assertThat(page.getValue().getPageSize()).isEqualTo(10);
    }

    @Test
    @DisplayName("the limit can never exceed the maximum")
    void limitIsCapped() {
        when(orders.findByStatusOrderByCreatedAtAscIdAsc(eq(OrderStatus.CREATED), any(Pageable.class))).thenReturn(List.of());

        service.readyForDispatch(null, 100_000);

        ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
        verify(orders).findByStatusOrderByCreatedAtAscIdAsc(eq(OrderStatus.CREATED), page.capture());
        assertThat(page.getValue().getPageSize()).isEqualTo(DispatchQueryService.MAX_LIMIT);
    }
}
