package com.swiftdrop.order.location;

import com.swiftdrop.order.pricing.PricingProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Estimates the distance between two towns: the straight-line distance between their centres times the
 * configured road factor (1.0 = straight line), rounded to 2 decimals. Two towns in different districts are
 * "cross-zone". The estimate is computed on the server only; clients never supply a distance.
 */
@Component
public class RouteEstimator {

    private final PricingProperties tariff;

    public RouteEstimator(PricingProperties tariff) {
        this.tariff = tariff;
    }

    public RouteEstimate estimate(City from, City to) {
        double straightLineKm = DistanceCalculator.haversineKm(
                from.latitude(), from.longitude(), to.latitude(), to.longitude());
        BigDecimal distanceKm = BigDecimal.valueOf(straightLineKm)
                .multiply(tariff.roadDistanceFactor())
                .setScale(2, RoundingMode.HALF_UP);
        boolean crossZone = !from.district().equalsIgnoreCase(to.district());
        return new RouteEstimate(distanceKm, crossZone);
    }

    public record RouteEstimate(BigDecimal distanceKm, boolean crossZone) {
    }
}
