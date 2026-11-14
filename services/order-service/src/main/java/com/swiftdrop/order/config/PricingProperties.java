package com.swiftdrop.order.config;

import com.swiftdrop.order.entity.enums.ParcelSize;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;

/**
 * Configurable delivery pricing parameters (BD-06).
 *
 * Initial default values are explicitly marked as PROVISIONAL (`provisional = true`)
 * until final production commercial rates are confirmed by Head Office (UD-10).
 */
@Configuration
@ConfigurationProperties(prefix = "swiftdrop.pricing")
public class PricingProperties {

    private boolean provisional = true;
    private String currency = "LKR";
    private BigDecimal baseFee = new BigDecimal("450.00");
    private BigDecimal perKmRate = new BigDecimal("65.00");
    private BigDecimal includedWeightKg = new BigDecimal("1.00");
    private BigDecimal perKgRate = new BigDecimal("120.00");
    private int quoteValidityMinutes = 30;
    private Map<ParcelSize, BigDecimal> sizeSurcharges = new EnumMap<>(ParcelSize.class);

    public PricingProperties() {
        sizeSurcharges.put(ParcelSize.SMALL, new BigDecimal("0.00"));
        sizeSurcharges.put(ParcelSize.MEDIUM, new BigDecimal("250.00"));
        sizeSurcharges.put(ParcelSize.LARGE, new BigDecimal("650.00"));
        sizeSurcharges.put(ParcelSize.EXTRA_LARGE, new BigDecimal("1200.00"));
    }

    public boolean isProvisional() {
        return provisional;
    }

    public void setProvisional(boolean provisional) {
        this.provisional = provisional;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getBaseFee() {
        return baseFee;
    }

    public void setBaseFee(BigDecimal baseFee) {
        this.baseFee = baseFee;
    }

    public BigDecimal getPerKmRate() {
        return perKmRate;
    }

    public void setPerKmRate(BigDecimal perKmRate) {
        this.perKmRate = perKmRate;
    }

    public BigDecimal getIncludedWeightKg() {
        return includedWeightKg;
    }

    public void setIncludedWeightKg(BigDecimal includedWeightKg) {
        this.includedWeightKg = includedWeightKg;
    }

    public BigDecimal getPerKgRate() {
        return perKgRate;
    }

    public void setPerKgRate(BigDecimal perKgRate) {
        this.perKgRate = perKgRate;
    }

    public int getQuoteValidityMinutes() {
        return quoteValidityMinutes;
    }

    public void setQuoteValidityMinutes(int quoteValidityMinutes) {
        this.quoteValidityMinutes = quoteValidityMinutes;
    }

    public Map<ParcelSize, BigDecimal> getSizeSurcharges() {
        return sizeSurcharges;
    }

    public void setSizeSurcharges(Map<ParcelSize, BigDecimal> sizeSurcharges) {
        this.sizeSurcharges = sizeSurcharges;
    }

    public BigDecimal getSurchargeForSize(ParcelSize size) {
        if (size == null || sizeSurcharges == null) {
            return BigDecimal.ZERO;
        }
        return sizeSurcharges.getOrDefault(size, BigDecimal.ZERO);
    }
}

