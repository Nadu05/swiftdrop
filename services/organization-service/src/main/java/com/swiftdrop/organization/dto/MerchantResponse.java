package com.swiftdrop.organization.dto;

import java.time.LocalDateTime;

/**
 * Merchant profile representation returned by the Merchant API.
 *
 * <p>{@code reviewedBy} is currently always {@code null}: no verified administrator identity is
 * available until authentication is integrated, and a client-supplied reviewer ID is never trusted.</p>
 */
public class MerchantResponse {

    private Long id;
    private String identityUserId;
    private String businessName;
    private String businessRegistrationNumber;
    private String businessType;
    private String contactPersonName;
    private String contactEmail;
    private String contactPhone;
    private String businessAddressLine1;
    private String businessAddressLine2;
    private String city;
    private String status;
    private String rejectionReason;
    private String suspensionReason;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public MerchantResponse() {}

    public MerchantResponse(
            Long id,
            String identityUserId,
            String businessName,
            String businessRegistrationNumber,
            String businessType,
            String contactPersonName,
            String contactEmail,
            String contactPhone,
            String businessAddressLine1,
            String businessAddressLine2,
            String city,
            String status,
            String rejectionReason,
            String suspensionReason,
            String reviewedBy,
            LocalDateTime reviewedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.id = id;
        this.identityUserId = identityUserId;
        this.businessName = businessName;
        this.businessRegistrationNumber = businessRegistrationNumber;
        this.businessType = businessType;
        this.contactPersonName = contactPersonName;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.businessAddressLine1 = businessAddressLine1;
        this.businessAddressLine2 = businessAddressLine2;
        this.city = city;
        this.status = status;
        this.rejectionReason = rejectionReason;
        this.suspensionReason = suspensionReason;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = reviewedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIdentityUserId() { return identityUserId; }
    public void setIdentityUserId(String identityUserId) { this.identityUserId = identityUserId; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getBusinessRegistrationNumber() { return businessRegistrationNumber; }
    public void setBusinessRegistrationNumber(String businessRegistrationNumber) { this.businessRegistrationNumber = businessRegistrationNumber; }

    public String getBusinessType() { return businessType; }
    public void setBusinessType(String businessType) { this.businessType = businessType; }

    public String getContactPersonName() { return contactPersonName; }
    public void setContactPersonName(String contactPersonName) { this.contactPersonName = contactPersonName; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getBusinessAddressLine1() { return businessAddressLine1; }
    public void setBusinessAddressLine1(String businessAddressLine1) { this.businessAddressLine1 = businessAddressLine1; }

    public String getBusinessAddressLine2() { return businessAddressLine2; }
    public void setBusinessAddressLine2(String businessAddressLine2) { this.businessAddressLine2 = businessAddressLine2; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getSuspensionReason() { return suspensionReason; }
    public void setSuspensionReason(String suspensionReason) { this.suspensionReason = suspensionReason; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

