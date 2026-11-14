package com.swiftdrop.organization.entity;

import com.swiftdrop.organization.entity.enums.MerchantBusinessType;
import com.swiftdrop.organization.entity.enums.MerchantStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * JPA entity representing a merchant organization profile and its onboarding/approval state.
 *
 * <p>{@code identityUserId} is an <strong>external, unverified reference</strong> to an Identity
 * Service user. There is no foreign key to the Identity database (separate database per service),
 * and no credentials or tokens are stored here.</p>
 *
 * <p>{@code version} provides optimistic locking so concurrent review actions cannot both succeed
 * (which would otherwise publish duplicate lifecycle events).</p>
 */
@Entity
@Table(name = "merchant_profiles")
public class MerchantProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "identity_user_id", length = 100, unique = true, updatable = false)
    private String identityUserId;

    @Column(name = "business_name", nullable = false, length = 255)
    private String businessName;

    @Column(name = "business_registration_number", nullable = false, length = 50, unique = true)
    private String businessRegistrationNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_type", nullable = false, length = 30)
    private MerchantBusinessType businessType;

    @Column(name = "contact_person_name", nullable = false, length = 255)
    private String contactPersonName;

    @Column(name = "contact_email", nullable = false, length = 255)
    private String contactEmail;

    @Column(name = "contact_phone", nullable = false, length = 50)
    private String contactPhone;

    @Column(name = "business_address_line1", nullable = false, length = 500)
    private String businessAddressLine1;

    @Column(name = "business_address_line2", length = 500)
    private String businessAddressLine2;

    @Column(nullable = false, length = 255)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MerchantStatus status = MerchantStatus.PENDING;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "suspension_reason", length = 1000)
    private String suspensionReason;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public MerchantProfile() {}

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIdentityUserId() { return identityUserId; }
    public void setIdentityUserId(String identityUserId) { this.identityUserId = identityUserId; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getBusinessRegistrationNumber() { return businessRegistrationNumber; }
    public void setBusinessRegistrationNumber(String businessRegistrationNumber) { this.businessRegistrationNumber = businessRegistrationNumber; }

    public MerchantBusinessType getBusinessType() { return businessType; }
    public void setBusinessType(MerchantBusinessType businessType) { this.businessType = businessType; }

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

    public MerchantStatus getStatus() { return status; }
    public void setStatus(MerchantStatus status) { this.status = status; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getSuspensionReason() { return suspensionReason; }
    public void setSuspensionReason(String suspensionReason) { this.suspensionReason = suspensionReason; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

