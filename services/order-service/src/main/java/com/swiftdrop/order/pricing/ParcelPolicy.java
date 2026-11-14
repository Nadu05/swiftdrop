package com.swiftdrop.order.pricing;

import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.BusinessRuleException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Rules for which weights are acceptable for a parcel size, so a "SMALL" parcel cannot weigh 50 kg.
 * Shared by the quote and order creation so both enforce exactly the same limits.
 */
@Component
public class ParcelPolicy {

    private final PricingProperties tariff;

    public ParcelPolicy(PricingProperties tariff) {
        this.tariff = tariff;
    }

    /** @throws BusinessRuleException (HTTP 422) when the weight is too high for the size */
    public void validate(ParcelSize size, BigDecimal weightKg) {
        BigDecimal limit = tariff.maxWeightKg().get(size);
        if (weightKg.compareTo(limit) > 0) {
            throw new BusinessRuleException("A " + size + " parcel can weigh at most "
                    + limit.stripTrailingZeros().toPlainString()
                    + " kg. Choose a larger size or reduce the weight.");
        }
    }
}
