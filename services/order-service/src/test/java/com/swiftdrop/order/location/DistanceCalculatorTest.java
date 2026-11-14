package com.swiftdrop.order.location;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class DistanceCalculatorTest {

    // Expected values were computed with an independent implementation (Node.js), not copied from this class.

    @Test
    @DisplayName("Colombo to Kandy is about 94.3 km in a straight line")
    void colomboToKandy() {
        assertThat(DistanceCalculator.haversineKm(6.9271, 79.8612, 7.2906, 80.6337)).isCloseTo(94.3354, within(0.001));
    }

    @Test
    @DisplayName("Colombo to Jaffna is about 304.6 km")
    void colomboToJaffna() {
        assertThat(DistanceCalculator.haversineKm(6.9271, 79.8612, 9.6615, 80.0255)).isCloseTo(304.5883, within(0.001));
    }

    @Test
    @DisplayName("the distance is symmetric")
    void symmetric() {
        double ab = DistanceCalculator.haversineKm(6.9271, 79.8612, 7.2906, 80.6337);
        double ba = DistanceCalculator.haversineKm(7.2906, 80.6337, 6.9271, 79.8612);

        assertThat(ab).isEqualTo(ba, within(1e-9));
    }

    @Test
    @DisplayName("the same point is exactly zero")
    void samePoint() {
        assertThat(DistanceCalculator.haversineKm(6.9271, 79.8612, 6.9271, 79.8612)).isZero();
    }

    @Test
    @DisplayName("extreme (antipodal) points stay finite and about half the Earth's circumference")
    void antipodal() {
        double km = DistanceCalculator.haversineKm(0, 0, 0, 180);

        assertThat(km).isFinite().isCloseTo(20015.1, within(1.0));
    }
}
