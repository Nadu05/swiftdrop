package com.swiftdrop.order.pricing;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The agreed tariff (documented in docs/pricing.md):
 *
 * <pre>
 * fee = baseFee
 *     + max(0, weightKg - includedWeightKg) * extraWeightFeePerKg
 *     + distanceKm * distanceFeePerKm
 *     + (crossZone ? zoneSurcharge : 0)
 * </pre>
 *
 * Each component is rounded HALF_UP to 2 decimals and the total is the sum of the rounded components.
 */
@Component
@EnableConfigurationProperties(PricingProperties.class)
public class TariffFeeCalculator implements FeeCalculator {

    private static final int SCALE = 2;

    private final PricingProperties tariff;

    public TariffFeeCalculator(PricingProperties tariff) {
        this.tariff = tariff;
    }

    @Override
    public FeeBreakdown calculate(FeeInput input) {
        BigDecimal base = money(tariff.baseFee());

        BigDecimal extraWeightKg = input.weightKg().subtract(tariff.includedWeightKg()).max(BigDecimal.ZERO);
        BigDecimal weightFee = money(extraWeightKg.multiply(tariff.extraWeightFeePerKg()));

        BigDecimal distanceFee = money(input.distanceKm().multiply(tariff.distanceFeePerKm()));

        BigDecimal zone = input.crossZone() ? money(tariff.zoneSurcharge()) : money(BigDecimal.ZERO);

        BigDecimal total = base.add(weightFee).add(distanceFee).add(zone);
        return new FeeBreakdown(base, weightFee, distanceFee, zone, total, tariff.currency());
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }
}
