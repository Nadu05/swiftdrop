package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Interim formula: {@code fee = baseFee + perKgFee * weightKg}, rounded HALF_UP to 2 decimals.
 * Parcel size is accepted for the future formula but does not change the interim fee.
 */
@Component
@EnableConfigurationProperties(PricingProperties.class)
public class ConfigurableFeeCalculator implements FeeCalculator {

    private final PricingProperties properties;

    public ConfigurableFeeCalculator(PricingProperties properties) {
        this.properties = properties;
    }

    @Override
    public FeeQuote calculate(ParcelSize size, BigDecimal weightKg) {
        BigDecimal base = properties.baseFee().setScale(2, RoundingMode.HALF_UP);
        BigDecimal weightFee = properties.perKgFee().multiply(weightKg).setScale(2, RoundingMode.HALF_UP);
        return new FeeQuote(base.add(weightFee), properties.currency(), base, weightFee);
    }
}
