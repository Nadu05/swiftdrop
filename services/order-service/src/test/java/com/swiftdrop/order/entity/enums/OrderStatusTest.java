package com.swiftdrop.order.entity.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.EnumSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderStatusTest {

    @Test
    @DisplayName("the happy path moves one step at a time")
    void happyPath() {
        assertTrue(OrderStatus.CREATED.canTransitionTo(OrderStatus.PICKED_UP));
        assertTrue(OrderStatus.PICKED_UP.canTransitionTo(OrderStatus.IN_TRANSIT));
        assertTrue(OrderStatus.IN_TRANSIT.canTransitionTo(OrderStatus.OUT_FOR_DELIVERY));
        assertTrue(OrderStatus.OUT_FOR_DELIVERY.canTransitionTo(OrderStatus.DELIVERED));
    }

    @Test
    @DisplayName("exactly these moves are allowed, every other pair is rejected")
    void fullMatrix() {
        Set<String> allowed = Set.of(
                "CREATED>PICKED_UP", "CREATED>FAILED",
                "PICKED_UP>IN_TRANSIT", "PICKED_UP>FAILED",
                "IN_TRANSIT>OUT_FOR_DELIVERY", "IN_TRANSIT>FAILED",
                "OUT_FOR_DELIVERY>DELIVERED", "OUT_FOR_DELIVERY>FAILED");
        for (OrderStatus from : OrderStatus.values()) {
            for (OrderStatus to : OrderStatus.values()) {
                assertThat(from.canTransitionTo(to))
                        .as("%s -> %s", from, to)
                        .isEqualTo(allowed.contains(from + ">" + to));
            }
        }
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"DELIVERED", "FAILED"})
    @DisplayName("DELIVERED and FAILED are final")
    void finalStatuses(OrderStatus status) {
        assertTrue(status.isFinal());
        assertThat(status.allowedNext()).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"})
    @DisplayName("every non-final status can fail but cannot go backwards or skip ahead")
    void nonFinalStatuses(OrderStatus status) {
        assertFalse(status.isFinal());
        assertTrue(status.canTransitionTo(OrderStatus.FAILED));
        assertFalse(status.canTransitionTo(OrderStatus.CREATED));
        assertFalse(status.canTransitionTo(status), "repeating the current status is not a transition");
        assertThat(status.allowedNext()).hasSize(2);
    }

    @Test
    @DisplayName("a missing target status is never allowed")
    void nullTarget() {
        assertFalse(OrderStatus.CREATED.canTransitionTo(null));
    }

    @Test
    @DisplayName("PICKED_UP cannot jump straight to DELIVERED")
    void noSkipping() {
        assertFalse(OrderStatus.CREATED.canTransitionTo(OrderStatus.DELIVERED));
        assertFalse(OrderStatus.PICKED_UP.canTransitionTo(OrderStatus.DELIVERED));
        assertFalse(OrderStatus.IN_TRANSIT.canTransitionTo(OrderStatus.DELIVERED));
    }

    @Test
    @DisplayName("every status has a label and a public description, and the labels match the frontend")
    void labelsAndDescriptions() {
        for (OrderStatus status : OrderStatus.values()) {
            assertThat(status.label()).isNotBlank();
            assertThat(status.publicDescription()).isNotBlank();
        }
        assertThat(EnumSet.allOf(OrderStatus.class).stream().map(OrderStatus::label))
                .containsExactly("Created", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed");
    }
}
