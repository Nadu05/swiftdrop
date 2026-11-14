package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.support.TestPricing;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

/** Tariff: base 500, 1 kg included, 100 per extra kg, 10 per km, zone surcharge 200. */
class TariffFeeCalculatorTest {

    private final TariffFeeCalculator calculator = new TariffFeeCalculator(TestPricing.defaults());

    private FeeBreakdown fee(String weight, String distance, boolean crossZone) {
        return calculator.calculate(new FeeInput(ParcelSize.MEDIUM, new BigDecimal(weight), new BigDecimal(distance), crossZone));
    }

    @ParameterizedTest(name = "{0} kg, {1} km, crossZone={2} -> base {3} + weight {4} + distance {5} + zone {6} = {7}")
    @CsvSource({
            // weight, distance, crossZone, base, weightFee, distanceFee, zone, total
            "1.00,  0.00,   false, 500.00, 0.00,   0.00,   0.00,   500.00",   // exactly the included weight: no weight fee
            "0.50,  0.00,   false, 500.00, 0.00,   0.00,   0.00,   500.00",   // below the included weight: never negative
            "0.01,  0.00,   false, 500.00, 0.00,   0.00,   0.00,   500.00",
            "1.50,  0.00,   false, 500.00, 50.00,  0.00,   0.00,   550.00",   // 0.5 kg over x 100
            "1.01,  0.00,   false, 500.00, 1.00,   0.00,   0.00,   501.00",   // 0.01 kg over x 100
            "1.50,  8.38,   false, 500.00, 50.00,  83.80,  0.00,   633.80",   // Colombo -> Dehiwala, same district
            "1.50,  94.34,  true,  500.00, 50.00,  943.40, 200.00, 1693.40",  // Colombo -> Kandy
            "2.00,  94.34,  true,  500.00, 100.00, 943.40, 200.00, 1743.40",
            "100.00, 304.59, true, 500.00, 9900.00, 3045.90, 200.00, 13645.90" // heaviest parcel, Colombo -> Jaffna
    })
    @DisplayName("applies the documented formula")
    void formula(String weight, String distance, boolean crossZone,
                 String base, String weightFee, String distanceFee, String zone, String total) {
        FeeBreakdown result = fee(weight, distance, crossZone);

        assertThat(result.baseFee()).isEqualByComparingTo(base);
        assertThat(result.weightFee()).isEqualByComparingTo(weightFee);
        assertThat(result.distanceFee()).isEqualByComparingTo(distanceFee);
        assertThat(result.zoneSurcharge()).isEqualByComparingTo(zone);
        assertThat(result.totalFee()).isEqualByComparingTo(total);
        assertThat(result.currency()).isEqualTo("LKR");
    }

    @Test
    @DisplayName("amounts are rounded HALF_UP to 2 decimals, per component")
    void rounding() {
        TariffFeeCalculator calc = new TariffFeeCalculator(TestPricing.withRates("0.00", "1.00", "0.37", "0.37", "0.00"));

        // extra weight: 1.05 kg x 0.37 = 0.3885 -> 0.39 ; distance: 1.05 km x 0.37 = 0.3885 -> 0.39
        FeeBreakdown result = calc.calculate(new FeeInput(ParcelSize.SMALL, new BigDecimal("2.05"), new BigDecimal("1.05"), false));

        assertThat(result.weightFee()).isEqualTo(new BigDecimal("0.39"));
        assertThat(result.distanceFee()).isEqualTo(new BigDecimal("0.39"));
        assertThat(result.totalFee()).isEqualTo(new BigDecimal("0.78"));
    }

    @Test
    @DisplayName("the total is always exactly the sum of its four parts, with 2 decimals")
    void totalIsSumOfParts() {
        Random random = new Random(42);
        for (int i = 0; i < 500; i++) {
            BigDecimal weight = BigDecimal.valueOf(1 + random.nextInt(10_000), 2);   // 0.01 .. 100.00
            BigDecimal distance = BigDecimal.valueOf(random.nextInt(60_000), 2);      // 0.00 .. 599.99
            FeeBreakdown result = calculator.calculate(new FeeInput(ParcelSize.LARGE, weight, distance, random.nextBoolean()));

            assertThat(result.totalFee()).isEqualTo(
                    result.baseFee().add(result.weightFee()).add(result.distanceFee()).add(result.zoneSurcharge()));
            assertThat(result.totalFee().scale()).isEqualTo(2);
        }
    }

    @Test
    @DisplayName("a heavier or longer delivery is never cheaper")
    void monotonic() {
        assertThat(fee("3.00", "50.00", false).totalFee()).isGreaterThan(fee("2.00", "50.00", false).totalFee());
        assertThat(fee("2.00", "60.00", false).totalFee()).isGreaterThan(fee("2.00", "50.00", false).totalFee());
        assertThat(fee("2.00", "50.00", true).totalFee()).isGreaterThan(fee("2.00", "50.00", false).totalFee());
    }
}
