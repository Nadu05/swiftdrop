package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.support.TestPricing;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Bad tariff configuration must stop the application instead of producing wrong fees. */
class PricingPropertiesTest {

    private static PricingProperties props(String currency, String base, String factor, Map<ParcelSize, BigDecimal> limits) {
        return new PricingProperties(currency, new BigDecimal(base), BigDecimal.ONE, new BigDecimal("100"),
                new BigDecimal("10"), new BigDecimal("200"), new BigDecimal(factor), limits);
    }

    @Test
    @DisplayName("a valid tariff is accepted")
    void valid() {
        assertThat(props("LKR", "500", "1.0", TestPricing.limits()).maxWeightKg()).hasSize(4);
    }

    @Test
    @DisplayName("a negative rate is rejected")
    void negativeRate() {
        assertThatThrownBy(() -> props("LKR", "-1", "1.0", TestPricing.limits()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("base-fee");
    }

    @Test
    @DisplayName("a road factor of zero or less is rejected")
    void badRoadFactor() {
        assertThatThrownBy(() -> props("LKR", "500", "0", TestPricing.limits()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("road-distance-factor");
    }

    @Test
    @DisplayName("a currency that is not a 3-letter code is rejected")
    void badCurrency() {
        assertThatThrownBy(() -> props("rupees", "500", "1.0", TestPricing.limits()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("currency");
    }

    @Test
    @DisplayName("every parcel size must have a weight limit")
    void missingSizeLimit() {
        Map<ParcelSize, BigDecimal> limits = TestPricing.limits();
        limits.remove(ParcelSize.LARGE);

        assertThatThrownBy(() -> props("LKR", "500", "1.0", limits))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("LARGE");
    }

    @Test
    @DisplayName("missing weight limits are rejected")
    void noLimitsAtAll() {
        assertThatThrownBy(() -> props("LKR", "500", "1.0", null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("max-weight-kg");
    }
}
