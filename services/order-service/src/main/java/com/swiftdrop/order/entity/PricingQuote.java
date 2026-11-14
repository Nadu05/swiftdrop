package com.swiftdrop.order.entity;

import com.swiftdrop.order.entity.enums.ParcelSize;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_quotes")
public class PricingQuote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quote_reference", nullable = false, unique = true, length = 64)
    private String quoteReference;

    @Column(name = "pickup_address", nullable = false, length = 500)
    private String pickupAddress;

    @Column(name = "pickup_latitude", nullable = false)
    private Double pickupLatitude;

    @Column(name = "pickup_longitude", nullable = false)
    private Double pickupLongitude;

    @Column(name = "dropoff_address", nullable = false, length = 500)
    private String dropoffAddress;

    @Column(name = "destination_latitude", nullable = false)
    private Double destinationLatitude;

    @Column(name = "destination_longitude", nullable = false)
    private Double destinationLongitude;

    @Column(name = "origin_branch_id", nullable = false)
    private Long originBranchId;

    @Column(name = "origin_branch_code", nullable = false, length = 50)
    private String originBranchCode;

    @Column(name = "origin_branch_name", nullable = false, length = 200)
    private String originBranchName;

    @Column(name = "destination_branch_id", nullable = false)
    private Long destinationBranchId;

    @Column(name = "destination_branch_code", nullable = false, length = 50)
    private String destinationBranchCode;

    @Column(name = "destination_branch_name", nullable = false, length = 200)
    private String destinationBranchName;

    @Column(name = "same_branch", nullable = false)
    private boolean sameBranch;

    @Enumerated(EnumType.STRING)
    @Column(name = "parcel_size", nullable = false, length = 30)
    private ParcelSize parcelSize;

    @Column(name = "weight_kg", nullable = false, precision = 8, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "estimated_distance_km", nullable = false, precision = 8, scale = 2)
    private BigDecimal estimatedDistanceKm;

    @Column(name = "base_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFee;

    @Column(name = "distance_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal distanceFee;

    @Column(name = "weight_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal weightFee;

    @Column(name = "size_surcharge", nullable = false, precision = 10, scale = 2)
    private BigDecimal sizeSurcharge;

    @Column(name = "estimated_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal estimatedFee;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "LKR";

    @Column(name = "provisional_pricing", nullable = false)
    private boolean provisionalPricing = true;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.expiresAt == null) {
            this.expiresAt = this.createdAt.plusMinutes(30);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getQuoteReference() {
        return quoteReference;
    }

    public void setQuoteReference(String quoteReference) {
        this.quoteReference = quoteReference;
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public Double getPickupLatitude() {
        return pickupLatitude;
    }

    public void setPickupLatitude(Double pickupLatitude) {
        this.pickupLatitude = pickupLatitude;
    }

    public Double getPickupLongitude() {
        return pickupLongitude;
    }

    public void setPickupLongitude(Double pickupLongitude) {
        this.pickupLongitude = pickupLongitude;
    }

    public String getDropoffAddress() {
        return dropoffAddress;
    }

    public void setDropoffAddress(String dropoffAddress) {
        this.dropoffAddress = dropoffAddress;
    }

    public Double getDestinationLatitude() {
        return destinationLatitude;
    }

    public void setDestinationLatitude(Double destinationLatitude) {
        this.destinationLatitude = destinationLatitude;
    }

    public Double getDestinationLongitude() {
        return destinationLongitude;
    }

    public void setDestinationLongitude(Double destinationLongitude) {
        this.destinationLongitude = destinationLongitude;
    }

    public Long getOriginBranchId() {
        return originBranchId;
    }

    public void setOriginBranchId(Long originBranchId) {
        this.originBranchId = originBranchId;
    }

    public String getOriginBranchCode() {
        return originBranchCode;
    }

    public void setOriginBranchCode(String originBranchCode) {
        this.originBranchCode = originBranchCode;
    }

    public String getOriginBranchName() {
        return originBranchName;
    }

    public void setOriginBranchName(String originBranchName) {
        this.originBranchName = originBranchName;
    }

    public Long getDestinationBranchId() {
        return destinationBranchId;
    }

    public void setDestinationBranchId(Long destinationBranchId) {
        this.destinationBranchId = destinationBranchId;
    }

    public String getDestinationBranchCode() {
        return destinationBranchCode;
    }

    public void setDestinationBranchCode(String destinationBranchCode) {
        this.destinationBranchCode = destinationBranchCode;
    }

    public String getDestinationBranchName() {
        return destinationBranchName;
    }

    public void setDestinationBranchName(String destinationBranchName) {
        this.destinationBranchName = destinationBranchName;
    }

    public boolean isSameBranch() {
        return sameBranch;
    }

    public void setSameBranch(boolean sameBranch) {
        this.sameBranch = sameBranch;
    }

    public ParcelSize getParcelSize() {
        return parcelSize;
    }

    public void setParcelSize(ParcelSize parcelSize) {
        this.parcelSize = parcelSize;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public BigDecimal getEstimatedDistanceKm() {
        return estimatedDistanceKm;
    }

    public void setEstimatedDistanceKm(BigDecimal estimatedDistanceKm) {
        this.estimatedDistanceKm = estimatedDistanceKm;
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

    public boolean isProvisionalPricing() {
        return provisionalPricing;
    }

    public void setProvisionalPricing(boolean provisionalPricing) {
        this.provisionalPricing = provisionalPricing;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

