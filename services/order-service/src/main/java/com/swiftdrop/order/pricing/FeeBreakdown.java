package com.swiftdrop.order.pricing;

import java.math.BigDecimal;

/**
 * A fee split into its parts. All amounts have 2 decimal places and {@code totalFee} is exactly the sum of
 * the four components, so a receipt always adds up.
 */
public record FeeBreakdown(
        BigDecimal baseFee,
        BigDecimal weightFee,
        BigDecimal distanceFee,
        BigDecimal zoneSurcharge,
        BigDecimal totalFee,
        String currency
) {
}
