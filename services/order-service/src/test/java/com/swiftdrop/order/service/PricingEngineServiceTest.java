package com.swiftdrop.order.service;

import com.swiftdrop.order.config.PricingProperties;
import com.swiftdrop.order.entity.enums.ParcelSize;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PricingEngineServiceTest {

    private PricingProperties properties;
    private PricingEngineService pricingEngineService;

    @BeforeEach
    void setUp() {
        properties = new PricingProperties();
        properties.setBaseFee(new BigDecimal("450.00"));
        properties.setPerKmRate(new BigDecimal("45.00"));
        properties.setPerKgRate(new BigDecimal("75.00"));
        properties.setIncludedWeightKg(new BigDecimal("1.00"));
        Map<ParcelSize, BigDecimal> surcharges = new EnumMap<>(ParcelSize.class);
        surcharges.put(ParcelSize.SMALL, new BigDecimal("0.00"));
        surcharges.put(ParcelSize.MEDIUM, new BigDecimal("250.00"));
        surcharges.put(ParcelSize.LARGE, new BigDecimal("650.00"));
        surcharges.put(ParcelSize.EXTRA_LARGE, new BigDecimal("1250.00"));
        properties.setSizeSurcharges(surcharges);
        properties.setCurrency("LKR");
        properties.setProvisional(true);
        pricingEngineService = new PricingEngineService(properties);
    }

    @Test
    void calculatePrice_SmallParcelWithinIncludedWeight_ComputesBasePlusDistanceWithNoWeightOrSizeSurcharge() {
        PricingEngineService.PricingCalculationResult result = pricingEngineService.calculatePrice(
                10.0,
                new BigDecimal("1.00"),
                ParcelSize.SMALL
        );

        // base = 450, distance = 10 * 45 = 450, weight = 0 (<= 1kg), size = 0 -> total = 900.00
        assertThat(result.baseFee()).isEqualByComparingTo("450.00");
        assertThat(result.distanceFee()).isEqualByComparingTo("450.00");
        assertThat(result.weightFee()).isEqualByComparingTo("0.00");
        assertThat(result.sizeSurcharge()).isEqualByComparingTo("0.00");
        assertThat(result.totalFee()).isEqualByComparingTo("900.00");
        assertThat(result.currency()).isEqualTo("LKR");
        assertThat(result.provisional()).isTrue();
    }

    @Test
    void calculatePrice_MediumParcelWithExtraWeight_ComputesAllComponentsCorrectly() {
        PricingEngineService.PricingCalculationResult result = pricingEngineService.calculatePrice(
                12.5,
                new BigDecimal("4.50"),
                ParcelSize.MEDIUM
        );

        // base = 450.00
        // distance = 12.5 * 45 = 562.50
        // chargeable weight = 4.50 - 1.00 = 3.50 * 75 = 262.50
        // medium surcharge = 250.00
        // total = 450 + 562.50 + 262.50 + 250 = 1525.00
        assertThat(result.baseFee()).isEqualByComparingTo("450.00");
        assertThat(result.distanceFee()).isEqualByComparingTo("562.50");
        assertThat(result.weightFee()).isEqualByComparingTo("262.50");
        assertThat(result.sizeSurcharge()).isEqualByComparingTo("250.00");
        assertThat(result.totalFee()).isEqualByComparingTo("1525.00");
    }

    @Test
    void calculatePrice_LargeAndExtraLargeParcels_AppliesConfiguredSizeSurcharges() {
        PricingEngineService.PricingCalculationResult largeResult = pricingEngineService.calculatePrice(
                5.0,
                new BigDecimal("2.00"),
                ParcelSize.LARGE
        );
        PricingEngineService.PricingCalculationResult xlResult = pricingEngineService.calculatePrice(
                5.0,
                new BigDecimal("2.00"),
                ParcelSize.EXTRA_LARGE
        );

        assertThat(largeResult.sizeSurcharge()).isEqualByComparingTo("650.00");
        assertThat(xlResult.sizeSurcharge()).isEqualByComparingTo("1250.00");
        assertThat(xlResult.totalFee().subtract(largeResult.totalFee())).isEqualByComparingTo("600.00");
    }

    @Test
    void calculatePrice_SubKilometerDistance_AppliesMinimumDistanceFloor() {
        PricingEngineService.PricingCalculationResult result = pricingEngineService.calculatePrice(
                0.2,
                new BigDecimal("0.50"),
                ParcelSize.SMALL
        );

        assertThat(result.distanceKm()).isEqualByComparingTo("0.50");
        assertThat(result.distanceFee()).isEqualByComparingTo("22.50");
        assertThat(result.totalFee()).isEqualByComparingTo("472.50");
    }

    @Test
    void calculatePrice_InvalidWeightOrDistance_ThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> pricingEngineService.calculatePrice(5.0, BigDecimal.ZERO, ParcelSize.SMALL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Parcel weight must be greater than zero");

        assertThatThrownBy(() -> pricingEngineService.calculatePrice(-2.0, new BigDecimal("1.0"), ParcelSize.SMALL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Distance cannot be negative");
    }
}
