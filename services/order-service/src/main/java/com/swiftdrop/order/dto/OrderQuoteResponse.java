package com.swiftdrop.order.dto;

import java.math.BigDecimal;

public class OrderQuoteResponse {

    private String quoteReference;
    private BigDecimal estimatedFee;
    private String currency;
    private BigDecimal estimatedDistanceKm;
    private boolean provisionalPricing;
    private BranchResolutionInfoDto originBranch;
    private BranchResolutionInfoDto destinationBranch;
    private boolean sameBranch;
    private BreakdownDto breakdown;
    private String expiresAt;

    public static class BreakdownDto {
        private BigDecimal baseFee;
        private BigDecimal distanceFee;
        private BigDecimal weightFee;
        private BigDecimal sizeSurcharge;

        public BreakdownDto() {
        }

        public BreakdownDto(
                BigDecimal baseFee,
                BigDecimal distanceFee,
                BigDecimal weightFee,
                BigDecimal sizeSurcharge) {
            this.baseFee = baseFee;
            this.distanceFee = distanceFee;
            this.weightFee = weightFee;
            this.sizeSurcharge = sizeSurcharge;
        }

        public BigDecimal getBaseFee() {
            return baseFee;
        }

        public void setBaseFee(BigDecimal baseFee) {
            this.baseFee = baseFee;
        }

        public BigDecimal getDistanceFee() {
            return distanceFee;
        }

        public void setDistanceFee(BigDecimal distanceFee) {
            this.distanceFee = distanceFee;
        }

        public BigDecimal getWeightFee() {
            return weightFee;
        }

        public void setWeightFee(BigDecimal weightFee) {
            this.weightFee = weightFee;
        }

        public BigDecimal getSizeSurcharge() {
            return sizeSurcharge;
        }

        public void setSizeSurcharge(BigDecimal sizeSurcharge) {
            this.sizeSurcharge = sizeSurcharge;
        }
    }

    public String getQuoteReference() {
        return quoteReference;
    }

    public void setQuoteReference(String quoteReference) {
        this.quoteReference = quoteReference;
    }

    public BigDecimal getEstimatedFee() {
        return estimatedFee;
    }

    public void setEstimatedFee(BigDecimal estimatedFee) {
        this.estimatedFee = estimatedFee;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getEstimatedDistanceKm() {
        return estimatedDistanceKm;
    }

    public void setEstimatedDistanceKm(BigDecimal estimatedDistanceKm) {
        this.estimatedDistanceKm = estimatedDistanceKm;
    }

    public boolean isProvisionalPricing() {
        return provisionalPricing;
    }

    public void setProvisionalPricing(boolean provisionalPricing) {
        this.provisionalPricing = provisionalPricing;
    }

    public BranchResolutionInfoDto getOriginBranch() {
        return originBranch;
    }

    public void setOriginBranch(BranchResolutionInfoDto originBranch) {
        this.originBranch = originBranch;
    }

    public BranchResolutionInfoDto getDestinationBranch() {
        return destinationBranch;
    }

    public void setDestinationBranch(BranchResolutionInfoDto destinationBranch) {
        this.destinationBranch = destinationBranch;
    }

    public boolean isSameBranch() {
        return sameBranch;
    }

    public void setSameBranch(boolean sameBranch) {
        this.sameBranch = sameBranch;
    }

    public BreakdownDto getBreakdown() {
        return breakdown;
    }

    public void setBreakdown(BreakdownDto breakdown) {
        this.breakdown = breakdown;
    }

    public String getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }
}

