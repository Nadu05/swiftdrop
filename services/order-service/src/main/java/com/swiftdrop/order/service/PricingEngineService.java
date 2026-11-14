package com.swiftdrop.order.service;

import com.swiftdrop.order.config.PricingProperties;
import com.swiftdrop.order.entity.enums.ParcelSize;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Authoritative pricing engine for SwiftDrop Order Service (BD-06).
 *
 * Calculates delivery fees using configurable parameters:
 * - Distance (km)
 * - Weight (kg above included threshold)
 * - Parcel size surcharge (SMALL, MEDIUM, LARGE, EXTRA_LARGE)
 */
@Service
public class PricingEngineService {

    private final PricingProperties pricingProperties;

    public PricingEngineService(PricingProperties pricingProperties) {
        this.pricingProperties = pricingProperties;
    }

    public record PricingCalculationResult(
            BigDecimal distanceKm,
            BigDecimal baseFee,
            BigDecimal distanceFee,
            BigDecimal weightFee,
            BigDecimal sizeSurcharge,
            BigDecimal totalFee,
            String currency,
            boolean provisional
    ) {
    }

    public PricingCalculationResult calculatePrice(
            double distanceKmRaw,
            BigDecimal weightKg,
            ParcelSize parcelSize) {

        if (distanceKmRaw < 0) {
            throw new IllegalArgumentException("Distance cannot be negative");
        }
        if (weightKg == null || weightKg.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Parcel weight must be greater than zero");
        }
        ParcelSize effectiveSize = parcelSize != null ? parcelSize : ParcelSize.MEDIUM;

        BigDecimal distanceKm = BigDecimal.valueOf(Math.max(0.5, distanceKmRaw))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal baseFee = pricingProperties.getBaseFee().setScale(2, RoundingMode.HALF_UP);

        BigDecimal distanceFee = distanceKm.multiply(pricingProperties.getPerKmRate())
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal extraWeight = weightKg.subtract(pricingProperties.getIncludedWeightKg());
        if (extraWeight.compareTo(BigDecimal.ZERO) < 0) {
            extraWeight = BigDecimal.ZERO;
        }
        BigDecimal weightFee = extraWeight.multiply(pricingProperties.getPerKgRate())
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal sizeSurcharge = pricingProperties.getSurchargeForSize(effectiveSize)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalFee = baseFee
                .add(distanceFee)
                .add(weightFee)
                .add(sizeSurcharge)
                .setScale(2, RoundingMode.HALF_UP);

        return new PricingCalculationResult(
                distanceKm,
                baseFee,
                distanceFee,
                weightFee,
                sizeSurcharge,
                totalFee,
                pricingProperties.getCurrency(),
                pricingProperties.isProvisional()
        );
    }

    public PricingProperties getPricingProperties() {
        return pricingProperties;
    }
}

