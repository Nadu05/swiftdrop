package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.support.TestPricing;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ParcelPolicyTest {

    private final ParcelPolicy policy = new ParcelPolicy(TestPricing.defaults());

    @ParameterizedTest(name = "{0} at {1} kg is accepted")
    @CsvSource({"SMALL, 0.01", "SMALL, 2.00", "MEDIUM, 10.00", "LARGE, 30.00", "EXTRA_LARGE, 100.00"})
    @DisplayName("accepts weights up to and including the limit for the size")
    void acceptsUpToLimit(ParcelSize size, String weight) {
        assertThatCode(() -> policy.validate(size, new BigDecimal(weight))).doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "{0} at {1} kg is rejected")
    @CsvSource({"SMALL, 2.01", "SMALL, 50.00", "MEDIUM, 10.01", "LARGE, 30.01", "EXTRA_LARGE, 100.01"})
    @DisplayName("rejects weights above the limit for the size with a business-rule error")
    void rejectsAboveLimit(ParcelSize size, String weight) {
        assertThatThrownBy(() -> policy.validate(size, new BigDecimal(weight)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining(size.name())
                .hasMessageContaining("at most");
    }

    @org.junit.jupiter.api.Test
    @DisplayName("the message names the limit without trailing zeros")
    void messageShowsLimit() {
        assertThatThrownBy(() -> policy.validate(ParcelSize.SMALL, new BigDecimal("3.00")))
                .hasMessage("A SMALL parcel can weigh at most 2 kg. Choose a larger size or reduce the weight.");
    }
}
