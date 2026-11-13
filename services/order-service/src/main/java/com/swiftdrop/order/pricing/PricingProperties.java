package com.swiftdrop.order.pricing;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.math.BigDecimal;

/**
 * Pricing rates, configurable via {@code swiftdrop.pricing.*}.
 *
 * <p>PLACEHOLDER VALUES: the agreed formula and rates are delivered in the
 * {@code feature/order-fee-calculation} work; these defaults only let order creation produce a
 * deterministic, documented fee until then.
 */
@ConfigurationProperties(prefix = "swiftdrop.pricing")
public record PricingProperties(
        @DefaultValue("LKR") String currency,
        @DefaultValue("500.00") BigDecimal baseFee,
        @DefaultValue("150.00") BigDecimal perKgFee
) {
}
