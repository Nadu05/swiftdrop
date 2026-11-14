package com.swiftdrop.order.dto;

import com.swiftdrop.order.pricing.FeeBreakdown;
import com.swiftdrop.order.pricing.PriceQuote;

import java.math.BigDecimal;

/**
 * Result of {@code POST /api/v1/orders/quote}. Shape matches the frontend {@code OrderQuoteResponse}
 * ({@code estimatedFee}, {@code currency}, {@code estimatedDistanceKm}, {@code breakdown}).
 */
public record QuoteResponse(
        BigDecimal estimatedFee,
        String currency,
        BigDecimal estimatedDistanceKm,
        FeeBreakdown breakdown
) {

    public static QuoteResponse from(PriceQuote quote) {
        return new QuoteResponse(quote.fee().totalFee(), quote.fee().currency(), quote.distanceKm(), quote.fee());
    }
}
