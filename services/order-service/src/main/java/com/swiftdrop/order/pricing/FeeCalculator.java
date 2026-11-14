package com.swiftdrop.order.pricing;

/**
 * Strategy for computing a delivery fee. Order creation and the quote endpoint both go through this
 * (via {@link PricingService}); the fee is never accepted from the client.
 */
public interface FeeCalculator {

    FeeBreakdown calculate(FeeInput input);
}
