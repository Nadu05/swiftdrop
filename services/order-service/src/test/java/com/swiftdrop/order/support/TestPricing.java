package com.swiftdrop.order.support;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.pricing.PricingProperties;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;

/** The tariff used in tests; it mirrors the defaults in application.yml. */
public final class TestPricing {

    private TestPricing() {
    }

    public static Map<ParcelSize, BigDecimal> limits() {
        Map<ParcelSize, BigDecimal> limits = new EnumMap<>(ParcelSize.class);
        limits.put(ParcelSize.SMALL, new BigDecimal("2.00"));
        limits.put(ParcelSize.MEDIUM, new BigDecimal("10.00"));
        limits.put(ParcelSize.LARGE, new BigDecimal("30.00"));
        limits.put(ParcelSize.EXTRA_LARGE, new BigDecimal("100.00"));
        return limits;
    }

    /** base 500, 1 kg included, 100/extra kg, 10/km, zone surcharge 200, straight-line distance. */
    public static PricingProperties defaults() {
        return withRoadFactor("1.0");
    }

    public static PricingProperties withRoadFactor(String factor) {
        return new PricingProperties("LKR", new BigDecimal("500.00"), new BigDecimal("1.00"),
                new BigDecimal("100.00"), new BigDecimal("10.00"), new BigDecimal("200.00"),
                new BigDecimal(factor), limits());
    }

    public static PricingProperties withRates(String base, String included, String perKg, String perKm, String zone) {
        return new PricingProperties("LKR", new BigDecimal(base), new BigDecimal(included),
                new BigDecimal(perKg), new BigDecimal(perKm), new BigDecimal(zone), BigDecimal.ONE, limits());
    }
}
