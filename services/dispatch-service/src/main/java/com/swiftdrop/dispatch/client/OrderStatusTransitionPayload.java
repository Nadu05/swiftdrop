package com.swiftdrop.dispatch.client;

public class OrderStatusTransitionPayload {
    private String status;
    private String location;
    private String description;
    private String courierId;
    private String courierName;
    private String courierPhone;
    private String courierVehicle;
    private String recipientConfirmedName;
    private String signatureReference;
    private String photoEvidenceUrl;

    public OrderStatusTransitionPayload() {
    }

    public OrderStatusTransitionPayload(String status, String location, String description) {
        this.status = status;
        this.location = location;
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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
}

