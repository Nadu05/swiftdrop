package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;

/**
 * The tariff, configurable via {@code swiftdrop.pricing.*} (see docs/pricing.md for the formula).
 * Invalid configuration (missing or negative rates, a size without a weight limit) stops the application
 * at startup rather than producing wrong fees.
 *
 * @param currency              ISO currency code of every amount
 * @param baseFee               charged on every delivery
 * @param includedWeightKg      weight covered by the base fee
 * @param extraWeightFeePerKg   charged per kg above {@code includedWeightKg}
 * @param distanceFeePerKm      charged per km between the pickup and delivery towns
 * @param zoneSurcharge         added when the two towns are in different districts
 * @param roadDistanceFactor    multiplier applied to the straight-line distance (1.0 = straight line)
 * @param maxWeightKg           heaviest parcel allowed for each size
 */
@ConfigurationProperties(prefix = "swiftdrop.pricing")
public record PricingProperties(
        @DefaultValue("LKR") String currency,
        @DefaultValue("500.00") BigDecimal baseFee,
        @DefaultValue("1.00") BigDecimal includedWeightKg,
        @DefaultValue("100.00") BigDecimal extraWeightFeePerKg,
        @DefaultValue("10.00") BigDecimal distanceFeePerKm,
        @DefaultValue("200.00") BigDecimal zoneSurcharge,
        @DefaultValue("1.0") BigDecimal roadDistanceFactor,
        Map<ParcelSize, BigDecimal> maxWeightKg
) {

    public PricingProperties {
        if (currency == null || !currency.matches("^[A-Z]{3}$")) {
            throw new IllegalArgumentException("swiftdrop.pricing.currency must be a 3-letter ISO code");
        }
        requireNotNegative(baseFee, "base-fee");
        requireNotNegative(includedWeightKg, "included-weight-kg");
        requireNotNegative(extraWeightFeePerKg, "extra-weight-fee-per-kg");
        requireNotNegative(distanceFeePerKm, "distance-fee-per-km");
        requireNotNegative(zoneSurcharge, "zone-surcharge");
        if (roadDistanceFactor == null || roadDistanceFactor.signum() <= 0) {
            throw new IllegalArgumentException("swiftdrop.pricing.road-distance-factor must be greater than 0");
        }
        if (maxWeightKg == null) {
            throw new IllegalArgumentException("swiftdrop.pricing.max-weight-kg must define a limit for every parcel size");
        }
        Map<ParcelSize, BigDecimal> limits = new EnumMap<>(ParcelSize.class);
        for (ParcelSize size : ParcelSize.values()) {
            BigDecimal limit = maxWeightKg.get(size);
            if (limit == null || limit.signum() <= 0) {
                throw new IllegalArgumentException("swiftdrop.pricing.max-weight-kg." + size + " must be greater than 0");
            }
            limits.put(size, limit);
        }
        maxWeightKg = Map.copyOf(limits);
    }

    private static void requireNotNegative(BigDecimal value, String name) {
        if (value == null || value.signum() < 0) {
            throw new IllegalArgumentException("swiftdrop.pricing." + name + " must be zero or greater");
        }
    }
}
