package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.location.City;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.location.RouteEstimator;
import com.swiftdrop.order.location.RouteEstimator.RouteEstimate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * The single place where a delivery is priced. Both {@code POST /orders/quote} and order creation call it, so
 * the fee shown before confirming is computed by exactly the same code as the fee charged.
 */
@Service
public class PricingService {

    private final CityDirectory cities;
    private final RouteEstimator routes;
    private final ParcelPolicy parcelPolicy;
    private final FeeCalculator feeCalculator;

    public PricingService(CityDirectory cities, RouteEstimator routes, ParcelPolicy parcelPolicy,
                          FeeCalculator feeCalculator) {
        this.cities = cities;
        this.routes = routes;
        this.parcelPolicy = parcelPolicy;
        this.feeCalculator = feeCalculator;
    }

    /**
     * @throws com.swiftdrop.order.exception.BusinessRuleException (HTTP 422) for an unsupported town or a
     *         weight that is too high for the parcel size
     */
    public PriceQuote quote(String pickupCode, String dropoffCode, ParcelSize size, BigDecimal weightKg) {
        City pickup = cities.require(pickupCode);
        City dropoff = cities.require(dropoffCode);
        parcelPolicy.validate(size, weightKg);

        RouteEstimate route = routes.estimate(pickup, dropoff);
        FeeBreakdown fee = feeCalculator.calculate(new FeeInput(size, weightKg, route.distanceKm(), route.crossZone()));
        return new PriceQuote(fee, route.distanceKm(), pickup, dropoff, route.crossZone());
    }
}
