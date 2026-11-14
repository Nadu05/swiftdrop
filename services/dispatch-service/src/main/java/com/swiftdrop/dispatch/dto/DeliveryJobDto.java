package com.swiftdrop.dispatch.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DeliveryJobDto {
    private Long id;
    private String jobCode;
    private String assignmentId;
    private String orderId;
    private String trackingNumber;
    private String status;
    private String priority;
    private Long branchId;
    private String branchCode;
    private String branchName;
    private String merchantName;
    private String merchantContact;
    private String pickupAddress;
    private String recipientName;
    private String recipientPhone;
    private String deliveryAddress;
    private String city;
    private String orderDate;
    private ParcelInfoDto parcelInfo;
    private RecipientDto recipient;
    private ParcelDto parcel;
    private BigDecimal distanceKm;
    private BigDecimal payoutLkr;
    private String paymentMethod;
    private BigDecimal codAmount;
    private int attemptCount;
    private int maxAttempts;
    private Long assignedCourierId;
    private String assignedCourierCode;
    private String assignedCourierName;
    private String assignedAt;
    private String pickedUpAt;
    private String completedAt;
    private ProofOfDeliverySummaryDto proofOfDelivery;
    private FailureSummaryDto failure;
    private List<AttemptRecordDto> attempts = new ArrayList<>();

    public DeliveryJobDto() {
    }

    public static class ParcelInfoDto {
        private BigDecimal weightKg;
        private String packageType;
        private String dimensions;
        private String handlingNotes;

        public ParcelInfoDto() {
        }

        public ParcelInfoDto(BigDecimal weightKg, String packageType, String dimensions, String handlingNotes) {
            this.weightKg = weightKg;
            this.packageType = packageType;
            this.dimensions = dimensions;
            this.handlingNotes = handlingNotes;
        }

        public BigDecimal getWeightKg() {
            return weightKg;
        }

        public void setWeightKg(BigDecimal weightKg) {
            this.weightKg = weightKg;
        }

        public String getPackageType() {
            return packageType;
        }

        public void setPackageType(String packageType) {
            this.packageType = packageType;
        }

        public String getDimensions() {
            return dimensions;
        }

        public void setDimensions(String dimensions) {
            this.dimensions = dimensions;
        }

        public String getHandlingNotes() {
            return handlingNotes;
        }

        public void setHandlingNotes(String handlingNotes) {
            this.handlingNotes = handlingNotes;
        }
    }

    public static class RecipientDto {
        private String name;
        private String phone;
        private String address;
        private String city;

        public RecipientDto() {
        }

        public RecipientDto(String name, String phone, String address, String city) {
            this.name = name;
            this.phone = phone;
            this.address = address;
            this.city = city;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getAddress() {
            return address;
        }

        public void setAddress(String address) {
            this.address = address;
        }

        public String getCity() {
            return city;
        }

        public void setCity(String city) {
            this.city = city;
        }
    }

    public static class ParcelDto {
        private String category;
        private BigDecimal weightKg;
        private String handlingNotes;

        public ParcelDto() {
        }

        public ParcelDto(String category, BigDecimal weightKg, String handlingNotes) {
            this.category = category;
            this.weightKg = weightKg;
            this.handlingNotes = handlingNotes;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public BigDecimal getWeightKg() {
            return weightKg;
        }

        public void setWeightKg(BigDecimal weightKg) {
            this.weightKg = weightKg;
        }

        public String getHandlingNotes() {
            return handlingNotes;
        }

        public void setHandlingNotes(String handlingNotes) {
            this.handlingNotes = handlingNotes;
        }
    }

    public static class ProofOfDeliverySummaryDto {
        private String type;
        private String receivedBy;
        private String reference;
        private String signatureReference;
        private String photoEvidenceReference;
        private String parcelReference;
        private String deliveredAt;
        private String courierName;

        public ProofOfDeliverySummaryDto() {
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getReceivedBy() {
            return receivedBy;
        }

        public void setReceivedBy(String receivedBy) {
            this.receivedBy = receivedBy;
        }

        public String getReference() {
            return reference;
        }

        public void setReference(String reference) {
            this.reference = reference;
        }

        public String getSignatureReference() {
            return signatureReference;
        }

        public void setSignatureReference(String signatureReference) {
            this.signatureReference = signatureReference;
        }

        public String getPhotoEvidenceReference() {
            return photoEvidenceReference;
        }

        public void setPhotoEvidenceReference(String photoEvidenceReference) {
            this.photoEvidenceReference = photoEvidenceReference;
        }

        public String getParcelReference() {
            return parcelReference;
        }

        public void setParcelReference(String parcelReference) {
            this.parcelReference = parcelReference;
        }

        public String getDeliveredAt() {
            return deliveredAt;
        }

        public void setDeliveredAt(String deliveredAt) {
            this.deliveredAt = deliveredAt;
        }

        public String getCourierName() {
            return courierName;
        }

        public void setCourierName(String courierName) {
            this.courierName = courierName;
        }
    }

    public static class FailureSummaryDto {
        private String reason;
        private String notes;

        public FailureSummaryDto() {
        }

        public FailureSummaryDto(String reason, String notes) {
            this.reason = reason;
            this.notes = notes;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }
    }

    public static class AttemptRecordDto {
        private Long id;
        private int attemptNumber;
        private String outcome;
        private String failureReason;
        private String notes;
        private String courierName;
        private String attemptedAt;

        public AttemptRecordDto() {
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public int getAttemptNumber() {
            return attemptNumber;
        }

        public void setAttemptNumber(int attemptNumber) {
            this.attemptNumber = attemptNumber;
        }

        public String getOutcome() {
            return outcome;
        }

        public void setOutcome(String outcome) {
            this.outcome = outcome;
        }

        public String getFailureReason() {
            return failureReason;
        }

        public void setFailureReason(String failureReason) {
            this.failureReason = failureReason;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }

        public String getCourierName() {
            return courierName;
        }

        public void setCourierName(String courierName) {
            this.courierName = courierName;
        }

        public String getAttemptedAt() {
            return attemptedAt;
        }

        public void setAttemptedAt(String attemptedAt) {
            this.attemptedAt = attemptedAt;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getJobCode() {
        return jobCode;
    }

    public void setJobCode(String jobCode) {
        this.jobCode = jobCode;
    }

    public String getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(String assignmentId) {
        this.assignmentId = assignmentId;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
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

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public String getMerchantContact() {
        return merchantContact;
    }

    public void setMerchantContact(String merchantContact) {
        this.merchantContact = merchantContact;
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getRecipientPhone() {
        return recipientPhone;
    }

    public void setRecipientPhone(String recipientPhone) {
        this.recipientPhone = recipientPhone;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(String orderDate) {
        this.orderDate = orderDate;
    }

    public ParcelInfoDto getParcelInfo() {
        return parcelInfo;
    }

    public void setParcelInfo(ParcelInfoDto parcelInfo) {
        this.parcelInfo = parcelInfo;
    }

    public RecipientDto getRecipient() {
        return recipient;
    }

    public void setRecipient(RecipientDto recipient) {
        this.recipient = recipient;
    }

    public ParcelDto getParcel() {
        return parcel;
    }

    public void setParcel(ParcelDto parcel) {
        this.parcel = parcel;
    }

    public BigDecimal getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(BigDecimal distanceKm) {
        this.distanceKm = distanceKm;
    }

    public BigDecimal getPayoutLkr() {
        return payoutLkr;
    }

    public void setPayoutLkr(BigDecimal payoutLkr) {
        this.payoutLkr = payoutLkr;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public BigDecimal getCodAmount() {
        return codAmount;
    }

    public void setCodAmount(BigDecimal codAmount) {
        this.codAmount = codAmount;
    }

    public int getAttemptCount() {
        return attemptCount;
    }

    public void setAttemptCount(int attemptCount) {
        this.attemptCount = attemptCount;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public Long getAssignedCourierId() {
        return assignedCourierId;
    }

    public void setAssignedCourierId(Long assignedCourierId) {
        this.assignedCourierId = assignedCourierId;
    }

    public String getAssignedCourierCode() {
        return assignedCourierCode;
    }

    public void setAssignedCourierCode(String assignedCourierCode) {
        this.assignedCourierCode = assignedCourierCode;
    }

    public String getAssignedCourierName() {
        return assignedCourierName;
    }

    public void setAssignedCourierName(String assignedCourierName) {
        this.assignedCourierName = assignedCourierName;
    }

    public String getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(String assignedAt) {
        this.assignedAt = assignedAt;
    }

    public String getPickedUpAt() {
        return pickedUpAt;
    }

    public void setPickedUpAt(String pickedUpAt) {
        this.pickedUpAt = pickedUpAt;
    }

    public String getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(String completedAt) {
        this.completedAt = completedAt;
    }

    public ProofOfDeliverySummaryDto getProofOfDelivery() {
        return proofOfDelivery;
    }

    public void setProofOfDelivery(ProofOfDeliverySummaryDto proofOfDelivery) {
        this.proofOfDelivery = proofOfDelivery;
    }

    public FailureSummaryDto getFailure() {
        return failure;
    }

    public void setFailure(FailureSummaryDto failure) {
        this.failure = failure;
    }

    public List<AttemptRecordDto> getAttempts() {
        return attempts;
    }

    public void setAttempts(List<AttemptRecordDto> attempts) {
        this.attempts = attempts;
    }
}

