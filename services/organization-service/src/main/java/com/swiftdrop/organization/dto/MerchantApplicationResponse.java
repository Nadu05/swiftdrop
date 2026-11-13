package com.swiftdrop.organization.dto;

import java.util.List;

public class MerchantApplicationResponse {

    private String id;
    private Long numericId;
    private String applicantUserId;
    private String applicantEmail;
    private String businessName;
    private String legalName;
    private String businessRegistrationNumber;
    private String category;
    private String categoryLabel;
    private ContactPersonDto contactPerson;
    private BusinessAddressDto businessAddress;
    private String expectedDailyVolume;
    private String submittedAt;
    private String updatedAt;
    private String status;
    private String statusLabel;
    private String rejectionReason;
    private String reviewedBy;
    private String reviewedAt;
    private String reviewNotes;
    private List<MerchantApplicationDocumentDto> documents;
    private List<MerchantApplicationHistoryDto> history;

    public static class ContactPersonDto {
        private String fullName;
        private String designation;
        private String email;
        private String phone;

        public ContactPersonDto() {}

        public ContactPersonDto(String fullName, String designation, String email, String phone) {
            this.fullName = fullName;
            this.designation = designation;
            this.email = email;
            this.phone = phone;
        }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getDesignation() { return designation; }
        public void setDesignation(String designation) { this.designation = designation; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
    }

    public static class BusinessAddressDto {
        private String street;
        private String city;
        private String district;
        private String postalCode;
        private String nearestBranch;

        public BusinessAddressDto() {}

        public BusinessAddressDto(String street, String city, String district, String postalCode, String nearestBranch) {
            this.street = street;
            this.city = city;
            this.district = district;
            this.postalCode = postalCode;
            this.nearestBranch = nearestBranch;
        }

        public String getStreet() { return street; }
        public void setStreet(String street) { this.street = street; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }

        public String getDistrict() { return district; }
        public void setDistrict(String district) { this.district = district; }

        public String getPostalCode() { return postalCode; }
        public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

        public String getNearestBranch() { return nearestBranch; }
        public void setNearestBranch(String nearestBranch) { this.nearestBranch = nearestBranch; }
    }

    public MerchantApplicationResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getNumericId() { return numericId; }
    public void setNumericId(Long numericId) { this.numericId = numericId; }

    public String getApplicantUserId() { return applicantUserId; }
    public void setApplicantUserId(String applicantUserId) { this.applicantUserId = applicantUserId; }

    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String applicantEmail) { this.applicantEmail = applicantEmail; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getLegalName() { return legalName; }
    public void setLegalName(String legalName) { this.legalName = legalName; }

    public String getBusinessRegistrationNumber() { return businessRegistrationNumber; }
    public void setBusinessRegistrationNumber(String businessRegistrationNumber) { this.businessRegistrationNumber = businessRegistrationNumber; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCategoryLabel() { return categoryLabel; }
    public void setCategoryLabel(String categoryLabel) { this.categoryLabel = categoryLabel; }

    public ContactPersonDto getContactPerson() { return contactPerson; }
    public void setContactPerson(ContactPersonDto contactPerson) { this.contactPerson = contactPerson; }

    public BusinessAddressDto getBusinessAddress() { return businessAddress; }
    public void setBusinessAddress(BusinessAddressDto businessAddress) { this.businessAddress = businessAddress; }

    public String getExpectedDailyVolume() { return expectedDailyVolume; }
    public void setExpectedDailyVolume(String expectedDailyVolume) { this.expectedDailyVolume = expectedDailyVolume; }

    public String getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(String submittedAt) { this.submittedAt = submittedAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStatusLabel() { return statusLabel; }
    public void setStatusLabel(String statusLabel) { this.statusLabel = statusLabel; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public String getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(String reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getReviewNotes() { return reviewNotes; }
    public void setReviewNotes(String reviewNotes) { this.reviewNotes = reviewNotes; }

    public List<MerchantApplicationDocumentDto> getDocuments() { return documents; }
    public void setDocuments(List<MerchantApplicationDocumentDto> documents) { this.documents = documents; }

    public List<MerchantApplicationHistoryDto> getHistory() { return history; }
    public void setHistory(List<MerchantApplicationHistoryDto> history) { this.history = history; }
}

