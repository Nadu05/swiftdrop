package com.swiftdrop.order.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.swiftdrop.order.dto.PublicTrackingResponse;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.OrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrackingServiceTest {

    private static final String NUMBER = "SD-261113-K7Q2XM4T";

    @Mock private DeliveryOrderRepository orders;
    @Mock private OrderStatusHistoryRepository history;

    private TrackingService service;

    @BeforeEach
    void setUp() {
        service = new TrackingService(orders, history, new CityDirectory());
    }

    private static DeliveryOrder order(String pickupCity, String dropoffCity) {
        DeliveryOrder order = new DeliveryOrder(42L, NUMBER);
        ReflectionTestUtils.setField(order, "id", 7L);
        ReflectionTestUtils.setField(order, "updatedAt", Instant.parse("2026-11-13T09:00:00Z"));
        order.setStatus(OrderStatus.IN_TRANSIT);
        order.setBranchId(3L);
        order.setPickupAddress("45 Galle Road, Colombo 03");
        order.setPickupContactName("Nuwan Pradeep");
        order.setPickupContactPhone("+94771234567");
        order.setDropoffAddress("12/4 Peradeniya Road, Kandy");
        order.setDropoffContactName("Ayesha Perera");
        order.setDropoffContactPhone("0718849201");
        order.setDeliveryInstructions("Leave with the guard");
        order.setParcelDescription("Electronic accessories");
        order.setParcelSize(ParcelSize.MEDIUM);
        order.setDeliveryFee(new BigDecimal("1693.40"));
        order.setDistanceKm(new BigDecimal("94.34"));
        order.setPickupCity(pickupCity);
        order.setDropoffCity(dropoffCity);
        return order;
    }

    private static OrderStatusHistory entry(DeliveryOrder order, OrderStatus status, String at) {
        OrderStatusHistory entry = new OrderStatusHistory(order, status, "driver note about 12/4 Peradeniya Road",
                "Kandy hub", 9L);
        ReflectionTestUtils.setField(entry, "createdAt", Instant.parse(at));
        return entry;
    }

    @Test
    @DisplayName("returns the status, towns and a timeline built from fixed public texts")
    void tracks() {
        DeliveryOrder order = order("COLOMBO", "KANDY");
        when(orders.findByTrackingNumber(NUMBER)).thenReturn(Optional.of(order));
        when(history.findByOrderIdOrderByCreatedAtAscIdAsc(7L)).thenReturn(List.of(
                entry(order, OrderStatus.CREATED, "2026-11-13T08:00:00Z"),
                entry(order, OrderStatus.PICKED_UP, "2026-11-13T08:30:00Z"),
                entry(order, OrderStatus.IN_TRANSIT, "2026-11-13T09:00:00Z")));

        PublicTrackingResponse response = service.track(NUMBER);

        assertThat(response.trackingNumber()).isEqualTo(NUMBER);
        assertThat(response.status()).isEqualTo(OrderStatus.IN_TRANSIT);
        assertThat(response.statusLabel()).isEqualTo("In Transit");
        assertThat(response.origin()).isEqualTo("Colombo");
        assertThat(response.destination()).isEqualTo("Kandy");
        assertThat(response.parcelCategory()).isEqualTo(ParcelSize.MEDIUM);
        assertThat(response.distanceKm()).isEqualByComparingTo("94.34");
        assertThat(response.updatedAt()).isEqualTo(Instant.parse("2026-11-13T09:00:00Z"));
        assertThat(response.events()).extracting("statusLabel").containsExactly("Created", "Picked Up", "In Transit");
        assertThat(response.events().get(1).description()).isEqualTo(OrderStatus.PICKED_UP.publicDescription());
        assertThat(response.events().get(1).timestamp()).isEqualTo(Instant.parse("2026-11-13T08:30:00Z"));
    }

    @Test
    @DisplayName("the public JSON holds no private data: no addresses, contacts, ids, notes, locations or fee")
    void exposesNothingPrivate() throws Exception {
        DeliveryOrder order = order("COLOMBO", "KANDY");
        when(orders.findByTrackingNumber(NUMBER)).thenReturn(Optional.of(order));
        when(history.findByOrderIdOrderByCreatedAtAscIdAsc(7L)).thenReturn(List.of(
                entry(order, OrderStatus.CREATED, "2026-11-13T08:00:00Z")));

        String json = new ObjectMapper().registerModule(new JavaTimeModule())
                .writeValueAsString(service.track(NUMBER));

        assertThat(json).doesNotContain("Galle", "Peradeniya", "Nuwan", "Ayesha", "0718849201", "771234567",
                "guard", "Electronic", "driver note", "Kandy hub", "1693", "customerId", "branchId", "changedBy",
                "deliveryFee", "idempotency", "\"id\"");
    }

    @Test
    @DisplayName("lower-case input and surrounding spaces still find the parcel")
    void normalisesInput() {
        DeliveryOrder order = order("COLOMBO", "KANDY");
        when(orders.findByTrackingNumber(NUMBER)).thenReturn(Optional.of(order));
        when(history.findByOrderIdOrderByCreatedAtAscIdAsc(7L)).thenReturn(List.of());

        assertThat(service.track("  sd-261113-k7q2xm4t ").trackingNumber()).isEqualTo(NUMBER);
        verify(orders).findByTrackingNumber(NUMBER);
    }

    @Test
    @DisplayName("an order placed before towns existed shows no origin or destination")
    void legacyOrderWithoutTowns() {
        DeliveryOrder order = order(null, null);
        when(orders.findByTrackingNumber(NUMBER)).thenReturn(Optional.of(order));
        when(history.findByOrderIdOrderByCreatedAtAscIdAsc(7L)).thenReturn(List.of());

        PublicTrackingResponse response = service.track(NUMBER);

        assertThat(response.origin()).isNull();
        assertThat(response.destination()).isNull();
    }

    @Test
    @DisplayName("an unknown tracking number is a 404")
    void unknownNumber() {
        when(orders.findByTrackingNumber("SD-261113-ZZZZ9999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.track("SD-261113-ZZZZ9999"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Tracking number not found");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   ", "SD", "12345", "SD-26111 3-K7Q2XM4T", "SD-261113-K7Q2XM4T; DROP TABLE x",
            "../../etc/passwd", "SD-261113-K7Q2XM4T-EXTRA-EXTRA-EXTRA-LONG", "%27%20OR%201=1"})
    @DisplayName("a malformed number is the same 404 as an unknown one and never reaches the database")
    void malformedNumber(String input) {
        assertThatThrownBy(() -> service.track(input))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Tracking number not found");
        verifyNoInteractions(orders, history);
    }
}
