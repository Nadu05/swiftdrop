package com.swiftdrop.organization.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class HaversineDistanceCalculatorTest {

    @Test
    @DisplayName("Should return exactly 0.0 distance for identical coordinates")
    void shouldReturnZeroForIdenticalCoordinates() {
        double distance = HaversineDistanceCalculator.calculateDistance(6.9271, 79.8612, 6.9271, 79.8612);
        assertThat(distance).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should accurately calculate distance between Colombo and Kandy (~95 km)")
    void shouldCalculateDistanceBetweenColomboAndKandy() {
        // Colombo: 6.9271, 79.8612
        // Kandy: 7.2906, 80.6337
        double distance = HaversineDistanceCalculator.calculateDistance(6.9271, 79.8612, 7.2906, 80.6337);
        // Geodesic distance is approximately 94-96 km
        assertThat(distance).isCloseTo(94.5, within(2.0));
    }

    @Test
    @DisplayName("Should calculate distance between points across international boundaries")
    void shouldCalculateAntipodalOrBoundaryPoints() {
        // North pole to South pole (~20015 km)
        double poleToPole = HaversineDistanceCalculator.calculateDistance(90.0, 0.0, -90.0, 0.0);
        assertThat(poleToPole).isCloseTo(20015.0, within(10.0));

        // Prime meridian to antimeridian at equator (~20015 km)
        double equatorialHalfGlobe = HaversineDistanceCalculator.calculateDistance(0.0, 0.0, 0.0, 180.0);
        assertThat(equatorialHalfGlobe).isCloseTo(20015.0, within(10.0));
    }

    @Test
    @DisplayName("Should handle very small distances without producing NaN or negative values")
    void shouldHandleTinyDistanceWithoutError() {
        double distance = HaversineDistanceCalculator.calculateDistance(6.927100, 79.861200, 6.927101, 79.861201);
        assertThat(distance).isGreaterThan(0.0);
        assertThat(distance).isLessThan(0.001); // Less than 1 meter
        assertThat(Double.isNaN(distance)).isFalse();
    }
}

