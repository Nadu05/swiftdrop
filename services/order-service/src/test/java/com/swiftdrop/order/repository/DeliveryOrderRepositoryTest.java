package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderStatusHistory;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.support.PostgresIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifies that the JPA mapping matches the Flyway schema (Hibernate runs in {@code validate} mode)
 * and that the database constraints protect the order invariants.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DeliveryOrderRepositoryTest extends PostgresIntegrationTest {

    @Autowired
    private DeliveryOrderRepository orders;

    @Autowired
    private OrderStatusHistoryRepository history;

    private DeliveryOrder newOrder(Long customerId, String trackingNumber) {
        DeliveryOrder order = new DeliveryOrder(customerId, trackingNumber);
        order.setPickupAddress("45 Galle Road, Colombo 03");
        order.setPickupContactName("Nuwan Pradeep");
        order.setPickupContactPhone("+94771234567");
        order.setDropoffAddress("12/4 Peradeniya Road, Kandy");
        order.setDropoffContactName("Ayesha Perera");
        order.setDropoffContactPhone("+94718849201");
        order.setParcelSize(ParcelSize.MEDIUM);
        order.setWeightKg(new BigDecimal("1.80"));
        order.setDeliveryFee(new BigDecimal("2400.00"));
        return order;
    }

    @Test
    @DisplayName("saves an order and its first history entry, and reads them back")
    void savesOrderWithHistory() {
        DeliveryOrder saved = orders.saveAndFlush(newOrder(1L, "SD-261113-AAAA1111"));
        history.saveAndFlush(new OrderStatusHistory(saved, OrderStatus.CREATED, "Order created", null, 1L));

        DeliveryOrder found = orders.findById(saved.getId()).orElseThrow();
        assertThat(found.getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(found.getCurrency()).isEqualTo("LKR");
        assertThat(found.getCreatedAt()).isNotNull();
        assertThat(found.getUpdatedAt()).isNotNull();
        assertThat(found.getDeliveryFee()).isEqualByComparingTo("2400.00");

        List<OrderStatusHistory> entries = history.findByOrderIdOrderByCreatedAtAsc(saved.getId());
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getStatus()).isEqualTo(OrderStatus.CREATED);
    }

    @Test
    @DisplayName("ownership lookup only returns the order for its own customer")
    void ownershipLookup() {
        DeliveryOrder saved = orders.saveAndFlush(newOrder(10L, "SD-261113-BBBB2222"));

        assertThat(orders.findByIdAndCustomerId(saved.getId(), 10L)).isPresent();
        assertThat(orders.findByIdAndCustomerId(saved.getId(), 11L)).isEmpty();
    }

    @Test
    @DisplayName("tracking numbers are unique")
    void trackingNumberUnique() {
        orders.saveAndFlush(newOrder(20L, "SD-261113-CCCC3333"));

        assertThat(orders.existsByTrackingNumber("SD-261113-CCCC3333")).isTrue();
        assertThatThrownBy(() -> orders.saveAndFlush(newOrder(21L, "SD-261113-CCCC3333")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("the same customer cannot reuse an idempotency key")
    void idempotencyKeyUniquePerCustomer() {
        DeliveryOrder first = newOrder(30L, "SD-261113-DDDD4444");
        first.setIdempotencyKey("key-1");
        orders.saveAndFlush(first);

        assertThat(orders.findByCustomerIdAndIdempotencyKey(30L, "key-1")).isPresent();
        assertThat(orders.findByCustomerIdAndIdempotencyKey(31L, "key-1")).isEmpty();

        DeliveryOrder duplicate = newOrder(30L, "SD-261113-EEEE5555");
        duplicate.setIdempotencyKey("key-1");
        assertThatThrownBy(() -> orders.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("database rejects a non-positive weight")
    void rejectsInvalidWeight() {
        DeliveryOrder order = newOrder(40L, "SD-261113-FFFF6666");
        order.setWeightKg(BigDecimal.ZERO);

        assertThatThrownBy(() -> orders.saveAndFlush(order))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
