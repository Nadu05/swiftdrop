package com.swiftdrop.order.pricing;

import com.swiftdrop.order.location.City;

import java.math.BigDecimal;

/** The outcome of pricing a delivery: the fee breakdown plus the inputs that produced it. */
public record PriceQuote(FeeBreakdown fee, BigDecimal distanceKm, City pickup, City dropoff, boolean crossZone) {
}
