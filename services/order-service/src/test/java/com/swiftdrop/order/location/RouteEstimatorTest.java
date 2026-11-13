package com.swiftdrop.order.location;

import com.swiftdrop.order.location.RouteEstimator.RouteEstimate;
import com.swiftdrop.order.support.TestPricing;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RouteEstimatorTest {

    private final CityDirectory cities = new CityDirectory();
    private final RouteEstimator straightLine = new RouteEstimator(TestPricing.defaults());

    private RouteEstimate estimate(RouteEstimator estimator, String from, String to) {
        return estimator.estimate(cities.require(from), cities.require(to));
    }

    @Test
    @DisplayName("different districts: distance rounded to 2 decimals and cross-zone")
    void differentDistricts() {
        RouteEstimate route = estimate(straightLine, "COLOMBO", "KANDY");

        assertThat(route.distanceKm()).isEqualByComparingTo("94.34");
        assertThat(route.crossZone()).isTrue();
    }

    @Test
    @DisplayName("same district: not cross-zone, even though the towns are different")
    void sameDistrict() {
        RouteEstimate route = estimate(straightLine, "COLOMBO", "DEHIWALA");

        assertThat(route.distanceKm()).isEqualByComparingTo("8.38");
        assertThat(route.crossZone()).isFalse();
    }

    @Test
    @DisplayName("the same town: zero distance and no surcharge")
    void sameTown() {
        RouteEstimate route = estimate(straightLine, "KANDY", "KANDY");

        assertThat(route.distanceKm()).isEqualByComparingTo("0.00");
        assertThat(route.crossZone()).isFalse();
    }

    @Test
    @DisplayName("the road factor multiplies the straight-line distance")
    void roadFactor() {
        RouteEstimator withFactor = new RouteEstimator(TestPricing.withRoadFactor("1.25"));

        // 94.3354 x 1.25 = 117.919... -> 117.92
        assertThat(estimate(withFactor, "COLOMBO", "KANDY").distanceKm()).isEqualByComparingTo("117.92");
    }

    @Test
    @DisplayName("the route is the same in both directions")
    void symmetric() {
        assertThat(estimate(straightLine, "GALLE", "JAFFNA").distanceKm())
                .isEqualByComparingTo(estimate(straightLine, "JAFFNA", "GALLE").distanceKm());
    }
}
