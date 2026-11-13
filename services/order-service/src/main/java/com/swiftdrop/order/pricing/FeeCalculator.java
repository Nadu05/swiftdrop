package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;

import java.math.BigDecimal;

/**
 * Strategy for computing a delivery fee. Order creation always calls this on the server; the fee is
 * never accepted from the client.
 */
public interface FeeCalculator {

    FeeQuote calculate(ParcelSize size, BigDecimal weightKg);

    /** Result of a fee calculation. Amounts use 2 decimal places. */
    record FeeQuote(BigDecimal totalFee, String currency, BigDecimal baseFee, BigDecimal weightFee) {
    }
}
