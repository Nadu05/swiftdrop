package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.location.RouteEstimator;
import com.swiftdrop.order.support.TestPricing;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The real collaborators wired together (no Spring, no mocks): cities, route, parcel policy and tariff. */
class PricingServiceTest {

    private final PricingProperties tariff = TestPricing.defaults();
    private final PricingService pricing = new PricingService(
            new CityDirectory(), new RouteEstimator(tariff), new ParcelPolicy(tariff), new TariffFeeCalculator(tariff));

    @Test
    @DisplayName("Colombo to Kandy, 1.5 kg: 500 + 50 + 943.40 + 200 = 1693.40")
    void crossDistrict() {
        PriceQuote quote = pricing.quote("COLOMBO", "KANDY", ParcelSize.MEDIUM, new BigDecimal("1.5"));

        assertThat(quote.distanceKm()).isEqualByComparingTo("94.34");
        assertThat(quote.crossZone()).isTrue();
        assertThat(quote.fee().baseFee()).isEqualByComparingTo("500.00");
        assertThat(quote.fee().weightFee()).isEqualByComparingTo("50.00");
        assertThat(quote.fee().distanceFee()).isEqualByComparingTo("943.40");
        assertThat(quote.fee().zoneSurcharge()).isEqualByComparingTo("200.00");
        assertThat(quote.fee().totalFee()).isEqualByComparingTo("1693.40");
        assertThat(quote.pickup().code()).isEqualTo("COLOMBO");
        assertThat(quote.dropoff().name()).isEqualTo("Kandy");
    }

    @Test
    @DisplayName("within one town the fee is just the base fee plus any extra weight")
    void sameTown() {
        PriceQuote quote = pricing.quote("COLOMBO", "COLOMBO", ParcelSize.MEDIUM, new BigDecimal("1.5"));

        assertThat(quote.distanceKm()).isEqualByComparingTo("0.00");
        assertThat(quote.fee().totalFee()).isEqualByComparingTo("550.00");
    }

    @Test
    @DisplayName("town codes are case-insensitive")
    void caseInsensitive() {
        assertThat(pricing.quote("colombo", " Kandy ", ParcelSize.MEDIUM, new BigDecimal("1.5")).fee().totalFee())
                .isEqualByComparingTo("1693.40");
    }

    @Test
    @DisplayName("an unsupported town is a business-rule error")
    void unknownCity() {
        assertThatThrownBy(() -> pricing.quote("ATLANTIS", "KANDY", ParcelSize.MEDIUM, BigDecimal.ONE))
                .isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> pricing.quote("KANDY", "ATLANTIS", ParcelSize.MEDIUM, BigDecimal.ONE))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    @DisplayName("a weight too heavy for the size is a business-rule error")
    void tooHeavyForSize() {
        assertThatThrownBy(() -> pricing.quote("COLOMBO", "KANDY", ParcelSize.SMALL, new BigDecimal("2.01")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("SMALL");
    }

    @Test
    @DisplayName("quoting is repeatable: the same inputs always give the same fee")
    void deterministic() {
        PriceQuote first = pricing.quote("GALLE", "JAFFNA", ParcelSize.LARGE, new BigDecimal("12.75"));
        PriceQuote second = pricing.quote("GALLE", "JAFFNA", ParcelSize.LARGE, new BigDecimal("12.75"));

        assertThat(first.fee()).isEqualTo(second.fee());
    }
}
