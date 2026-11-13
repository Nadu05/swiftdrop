package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.pricing.FeeCalculator.FeeQuote;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ConfigurableFeeCalculatorTest {

    private static ConfigurableFeeCalculator calculator(String base, String perKg) {
        return new ConfigurableFeeCalculator(new PricingProperties("LKR", new BigDecimal(base), new BigDecimal(perKg)));
    }

    @Test
    @DisplayName("fee is base fee plus per-kg fee times weight")
    void baseAndWeight() {
        FeeQuote quote = calculator("500.00", "150.00").calculate(ParcelSize.MEDIUM, new BigDecimal("1.50"));

        assertThat(quote.totalFee()).isEqualByComparingTo("725.00");
        assertThat(quote.baseFee()).isEqualByComparingTo("500.00");
        assertThat(quote.weightFee()).isEqualByComparingTo("225.00");
        assertThat(quote.currency()).isEqualTo("LKR");
    }

    @Test
    @DisplayName("amounts are rounded HALF_UP to 2 decimal places")
    void rounding() {
        // 0.37 * 1.05 = 0.3885 -> 0.39
        FeeQuote quote = calculator("0.00", "0.37").calculate(ParcelSize.SMALL, new BigDecimal("1.05"));

        assertThat(quote.weightFee()).isEqualTo(new BigDecimal("0.39"));
        assertThat(quote.totalFee().scale()).isEqualTo(2);
    }
}
