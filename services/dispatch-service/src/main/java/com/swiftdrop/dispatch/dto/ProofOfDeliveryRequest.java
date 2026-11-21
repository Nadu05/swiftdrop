package com.swiftdrop.dispatch.dto;

public class ProofOfDeliveryRequest {
    // Courier frontend aliases
    private String type;
    private String receivedBy;
    private String reference;

    // Explicit domain fields
    private String recipientName;
    private String proofType;
    private String signatureReference;
    private String photoEvidenceReference;
    private String otpReference;
    private String parcelReference;
    private String notes;

    public ProofOfDeliveryRequest() {
    }

    public String resolvedRecipientName() {
        if (recipientName != null && !recipientName.isBlank()) {
            return recipientName.trim();
        }
        if (receivedBy != null && !receivedBy.isBlank()) {
            return receivedBy.trim();
        }
        return null;
    }

    public String resolvedProofType() {
        if (proofType != null && !proofType.isBlank()) {
            return proofType.trim();
        }
        if (type != null && !type.isBlank()) {
            return type.trim();
        }
        if (photoEvidenceReference != null && !photoEvidenceReference.isBlank()) {
            return "PHOTO";
        }
        return "SIGNATURE";
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

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getProofType() {
        return proofType;
    }

    public void setProofType(String proofType) {
        this.proofType = proofType;
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

    public String getOtpReference() {
        return otpReference;
    }

    public void setOtpReference(String otpReference) {
        this.otpReference = otpReference;
    }

    public String getParcelReference() {
        return parcelReference;
    }

    public void setParcelReference(String parcelReference) {
        this.parcelReference = parcelReference;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

