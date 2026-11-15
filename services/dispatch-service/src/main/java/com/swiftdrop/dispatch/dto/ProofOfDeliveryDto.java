package com.swiftdrop.dispatch.dto;

import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;

public class ProofOfDeliveryDto {

    private String recipientName;
    private String confirmationDetails;
    private String podReference;
    private String photoUrl;
    private ProofOfDeliveryType podType;

    public ProofOfDeliveryDto() {}

    public ProofOfDeliveryDto(String recipientName, String confirmationDetails, String podReference,
                              String photoUrl, ProofOfDeliveryType podType) {
        this.recipientName = recipientName;
        this.confirmationDetails = confirmationDetails;
        this.podReference = podReference;
        this.photoUrl = photoUrl;
        this.podType = podType != null ? podType : ProofOfDeliveryType.SIGNATURE;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getConfirmationDetails() {
        return confirmationDetails;
    }

    public void setConfirmationDetails(String confirmationDetails) {
        this.confirmationDetails = confirmationDetails;
    }

    public String getPodReference() {
        return podReference;
    }

    public void setPodReference(String podReference) {
        this.podReference = podReference;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public ProofOfDeliveryType getPodType() {
        return podType;
    }

    public void setPodType(ProofOfDeliveryType podType) {
        this.podType = podType;
    }
}

