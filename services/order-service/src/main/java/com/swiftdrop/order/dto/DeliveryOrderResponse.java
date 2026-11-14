package com.swiftdrop.order.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Full DeliveryOrder representation compatible with both frontend `CreateOrderResponse`
 * and `DeliveryOrder` contracts plus full domain metadata.
 */
public class DeliveryOrderResponse {

    private Long id;
    private String trackingNumber;
    private String status;
    private String statusLabel;
    private String orderSourceType;
    private String customerUserId;
    private String customerEmail;
    private String merchantOrganizationId;
    private String pickupMethod;

    // Sender & Pickup Address
    private String pickupAddress;
    private String pickupCity;
    private String pickupPostalCode;
    private Double pickupLatitude;
    private Double pickupLongitude;
    private String pickupContactName;
    private String pickupContactPhone;
    private String pickupContactEmail;

    // Recipient & Dropoff Address
    private String dropoffAddress;
    private String dropoffCity;
    private String dropoffPostalCode;
    private Double destinationLatitude;
    private Double destinationLongitude;
    private String dropoffContactName;
    private String dropoffContactPhone;
    private String dropoffContactEmail;

    // Parcel summary
    private String parcelDescription;
    private String parcelSize;
    private BigDecimal weightKg;
    private boolean fragile;
    private BigDecimal declaredValue;
    private String deliveryInstructions;

    // Branch Resolution
    private Long originBranchId;
    private String originBranchCode;
    private String originBranchName;
    private Long destinationBranchId;
    private String destinationBranchCode;
    private String destinationBranchName;
    private String branch;
    private boolean sameBranch;
    private BigDecimal distanceKm;

    // Pricing & Payment (BD-01, BD-06)
    private String quoteReference;
    private BigDecimal baseFee;
    private BigDecimal distanceFee;
    private BigDecimal weightFee;
    private BigDecimal sizeSurcharge;
    private BigDecimal deliveryFee;
    private String currency;
    private String paymentMethod;
    private String paymentStatus;
    private BigDecimal codAmount;

    // Lifecycle & Retry (BD-02, BD-07, BD-08)
    private int failedAttemptCount;
    private String cancellationReason;
    private String courierId;
    private String courierName;
    private String courierPhone;
    private String courierVehicle;
    private String recipientConfirmedName;
    private String signatureReference;
    private String photoEvidenceUrl;
    private String deliveredAt;

    private String createdAt;
    private String updatedAt;
    private String message;

    private List<TrackingEventDto> trackingEvents;
    private List<PaymentReferenceDto> paymentReferences;

    public static class TrackingEventDto {
        private Long id;
        private String status;
        private String statusLabel;
        private String location;
        private String description;
        private String actorRole;
        private String timestamp;

        public TrackingEventDto() {
        }

        public TrackingEventDto(
                Long id,
                String status,
                String statusLabel,
                String location,
                String description,
                String actorRole,
                String timestamp) {
            this.id = id;
            this.status = status;
            this.statusLabel = statusLabel;
            this.location = location;
            this.description = description;
            this.actorRole = actorRole;
            this.timestamp = timestamp;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getStatusLabel() {
            return statusLabel;
        }

        public void setStatusLabel(String statusLabel) {
            this.statusLabel = statusLabel;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getActorRole() {
            return actorRole;
        }

        public void setActorRole(String actorRole) {
            this.actorRole = actorRole;
        }

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }
    }

    public static class PaymentReferenceDto {
        private Long id;
        private String paymentMethod;
        private String paymentStatus;
        private BigDecimal deliveryFeeAmount;
        private BigDecimal codCollectionAmount;
        private String currency;
        private String gatewayProvider;
        private String externalTransactionRef;
        private boolean verified;
        private String verifiedAt;
        private String createdAt;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getPaymentMethod() {
            return paymentMethod;
        }

        public void setPaymentMethod(String paymentMethod) {
            this.paymentMethod = paymentMethod;
        }

        public String getPaymentStatus() {
            return paymentStatus;
        }

        public void setPaymentStatus(String paymentStatus) {
            this.paymentStatus = paymentStatus;
        }

        public BigDecimal getDeliveryFeeAmount() {
            return deliveryFeeAmount;
        }

        public void setDeliveryFeeAmount(BigDecimal deliveryFeeAmount) {
            this.deliveryFeeAmount = deliveryFeeAmount;
        }

        public BigDecimal getCodCollectionAmount() {
            return codCollectionAmount;
        }

        public void setCodCollectionAmount(BigDecimal codCollectionAmount) {
            this.codCollectionAmount = codCollectionAmount;
        }

        public String getCurrency() {
            return currency;
        }

        public void setCurrency(String currency) {
            this.currency = currency;
        }

        public String getGatewayProvider() {
            return gatewayProvider;
        }

        public void setGatewayProvider(String gatewayProvider) {
            this.gatewayProvider = gatewayProvider;
        }

        public String getExternalTransactionRef() {
            return externalTransactionRef;
        }

        public void setExternalTransactionRef(String externalTransactionRef) {
            this.externalTransactionRef = externalTransactionRef;
        }

        public boolean isVerified() {
            return verified;
        }

        public void setVerified(boolean verified) {
            this.verified = verified;
        }

        public String getVerifiedAt() {
            return verifiedAt;
        }

        public void setVerifiedAt(String verifiedAt) {
            this.verifiedAt = verifiedAt;
        }

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStatusLabel() {
        return statusLabel;
    }

    public void setStatusLabel(String statusLabel) {
        this.statusLabel = statusLabel;
    }

    public String getOrderSourceType() {
        return orderSourceType;
    }

    public void setOrderSourceType(String orderSourceType) {
        this.orderSourceType = orderSourceType;
    }

    public String getCustomerUserId() {
        return customerUserId;
    }

    public void setCustomerUserId(String customerUserId) {
        this.customerUserId = customerUserId;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getMerchantOrganizationId() {
        return merchantOrganizationId;
    }

    public void setMerchantOrganizationId(String merchantOrganizationId) {
        this.merchantOrganizationId = merchantOrganizationId;
    }

    public String getPickupMethod() {
        return pickupMethod;
    }

    public void setPickupMethod(String pickupMethod) {
        this.pickupMethod = pickupMethod;
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public String getPickupCity() {
        return pickupCity;
    }

    public void setPickupCity(String pickupCity) {
        this.pickupCity = pickupCity;
    }

    public String getPickupPostalCode() {
        return pickupPostalCode;
    }

    public void setPickupPostalCode(String pickupPostalCode) {
        this.pickupPostalCode = pickupPostalCode;
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

    public String getPickupContactName() {
        return pickupContactName;
    }

    public void setPickupContactName(String pickupContactName) {
        this.pickupContactName = pickupContactName;
    }

    public String getPickupContactPhone() {
        return pickupContactPhone;
    }

    public void setPickupContactPhone(String pickupContactPhone) {
        this.pickupContactPhone = pickupContactPhone;
    }

    public String getPickupContactEmail() {
        return pickupContactEmail;
    }

    public void setPickupContactEmail(String pickupContactEmail) {
        this.pickupContactEmail = pickupContactEmail;
    }

    public String getDropoffAddress() {
        return dropoffAddress;
    }

    public void setDropoffAddress(String dropoffAddress) {
        this.dropoffAddress = dropoffAddress;
    }

    public String getDropoffCity() {
        return dropoffCity;
    }

    public void setDropoffCity(String dropoffCity) {
        this.dropoffCity = dropoffCity;
    }

    public String getDropoffPostalCode() {
        return dropoffPostalCode;
    }

    public void setDropoffPostalCode(String dropoffPostalCode) {
        this.dropoffPostalCode = dropoffPostalCode;
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

    public String getDropoffContactName() {
        return dropoffContactName;
    }

    public void setDropoffContactName(String dropoffContactName) {
        this.dropoffContactName = dropoffContactName;
    }

    public String getDropoffContactPhone() {
        return dropoffContactPhone;
    }

    public void setDropoffContactPhone(String dropoffContactPhone) {
        this.dropoffContactPhone = dropoffContactPhone;
    }

    public String getDropoffContactEmail() {
        return dropoffContactEmail;
    }

    public void setDropoffContactEmail(String dropoffContactEmail) {
        this.dropoffContactEmail = dropoffContactEmail;
    }

    public String getParcelDescription() {
        return parcelDescription;
    }

    public void setParcelDescription(String parcelDescription) {
        this.parcelDescription = parcelDescription;
    }

    public String getParcelSize() {
        return parcelSize;
    }

    public void setParcelSize(String parcelSize) {
        this.parcelSize = parcelSize;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public boolean isFragile() {
        return fragile;
    }

    public void setFragile(boolean fragile) {
        this.fragile = fragile;
    }

    public BigDecimal getDeclaredValue() {
        return declaredValue;
    }

    public void setDeclaredValue(BigDecimal declaredValue) {
        this.declaredValue = declaredValue;
    }

    public String getDeliveryInstructions() {
        return deliveryInstructions;
    }

    public void setDeliveryInstructions(String deliveryInstructions) {
        this.deliveryInstructions = deliveryInstructions;
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

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public boolean isSameBranch() {
        return sameBranch;
    }

    public void setSameBranch(boolean sameBranch) {
        this.sameBranch = sameBranch;
    }

    public BigDecimal getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(BigDecimal distanceKm) {
        this.distanceKm = distanceKm;
    }

    public String getQuoteReference() {
        return quoteReference;
    }

    public void setQuoteReference(String quoteReference) {
        this.quoteReference = quoteReference;
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

    public BigDecimal getDeliveryFee() {
        return deliveryFee;
    }

    public void setDeliveryFee(BigDecimal deliveryFee) {
        this.deliveryFee = deliveryFee;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public BigDecimal getCodAmount() {
        return codAmount;
    }

    public void setCodAmount(BigDecimal codAmount) {
        this.codAmount = codAmount;
    }

    public int getFailedAttemptCount() {
        return failedAttemptCount;
    }

    public void setFailedAttemptCount(int failedAttemptCount) {
        this.failedAttemptCount = failedAttemptCount;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public String getCourierId() {
        return courierId;
    }

    public void setCourierId(String courierId) {
        this.courierId = courierId;
    }

    public String getCourierName() {
        return courierName;
    }

    public void setCourierName(String courierName) {
        this.courierName = courierName;
    }

    public String getCourierPhone() {
        return courierPhone;
    }

    public void setCourierPhone(String courierPhone) {
        this.courierPhone = courierPhone;
    }

    public String getCourierVehicle() {
        return courierVehicle;
    }

    public void setCourierVehicle(String courierVehicle) {
        this.courierVehicle = courierVehicle;
    }

    public String getRecipientConfirmedName() {
        return recipientConfirmedName;
    }

    public void setRecipientConfirmedName(String recipientConfirmedName) {
        this.recipientConfirmedName = recipientConfirmedName;
    }

    public String getSignatureReference() {
        return signatureReference;
    }

    public void setSignatureReference(String signatureReference) {
        this.signatureReference = signatureReference;
    }

    public String getPhotoEvidenceUrl() {
        return photoEvidenceUrl;
    }

    public void setPhotoEvidenceUrl(String photoEvidenceUrl) {
        this.photoEvidenceUrl = photoEvidenceUrl;
    }

    public String getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(String deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<TrackingEventDto> getTrackingEvents() {
        return trackingEvents;
    }

    public void setTrackingEvents(List<TrackingEventDto> trackingEvents) {
        this.trackingEvents = trackingEvents;
    }

    public List<PaymentReferenceDto> getPaymentReferences() {
        return paymentReferences;
    }

    public void setPaymentReferences(List<PaymentReferenceDto> paymentReferences) {
        this.paymentReferences = paymentReferences;
    }
}
