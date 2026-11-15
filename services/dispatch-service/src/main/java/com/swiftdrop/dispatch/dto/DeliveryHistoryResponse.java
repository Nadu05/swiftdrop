package com.swiftdrop.dispatch.dto;

import java.util.ArrayList;
import java.util.List;

public class DeliveryHistoryResponse {

    private String id;
    private String orderId;
    private String trackingNumber;
    private DeliveryHistoryRecipientDto recipient;
    private DeliveryHistoryMerchantDto merchant;
    private DeliveryHistoryCourierDto courier;
    private String status;
    private ProofOfDeliveryDto pod;
    private FailureDetailsDto failureDetails;
    private String completedAt;
    private int deliveryAttempts;
    private String deliveryNotes;
    private DeliveryHistoryParcelDto parcel;
    private String priority;
    private List<HistoryTimelineEntryDto> timeline = new ArrayList<>();

    public DeliveryHistoryResponse() {}

    public DeliveryHistoryResponse(String id, String orderId, String trackingNumber,
                                   DeliveryHistoryRecipientDto recipient,
                                   DeliveryHistoryMerchantDto merchant,
                                   DeliveryHistoryCourierDto courier,
                                   String status, ProofOfDeliveryDto pod,
                                   FailureDetailsDto failureDetails, String completedAt,
                                   int deliveryAttempts, String deliveryNotes,
                                   DeliveryHistoryParcelDto parcel, String priority,
                                   List<HistoryTimelineEntryDto> timeline) {
        this.id = id;
        this.orderId = orderId;
        this.trackingNumber = trackingNumber;
        this.recipient = recipient;
        this.merchant = merchant;
        this.courier = courier;
        this.status = status;
        this.pod = pod;
        this.failureDetails = failureDetails;
        this.completedAt = completedAt;
        this.deliveryAttempts = deliveryAttempts;
        this.deliveryNotes = deliveryNotes;
        this.parcel = parcel;
        this.priority = priority;
        this.timeline = timeline != null ? timeline : new ArrayList<>();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public DeliveryHistoryRecipientDto getRecipient() {
        return recipient;
    }

    public void setRecipient(DeliveryHistoryRecipientDto recipient) {
        this.recipient = recipient;
    }

    public DeliveryHistoryMerchantDto getMerchant() {
        return merchant;
    }

    public void setMerchant(DeliveryHistoryMerchantDto merchant) {
        this.merchant = merchant;
    }

    public DeliveryHistoryCourierDto getCourier() {
        return courier;
    }

    public void setCourier(DeliveryHistoryCourierDto courier) {
        this.courier = courier;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public ProofOfDeliveryDto getPod() {
        return pod;
    }

    public void setPod(ProofOfDeliveryDto pod) {
        this.pod = pod;
    }

    public FailureDetailsDto getFailureDetails() {
        return failureDetails;
    }

    public void setFailureDetails(FailureDetailsDto failureDetails) {
        this.failureDetails = failureDetails;
    }

    public String getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(String completedAt) {
        this.completedAt = completedAt;
    }

    public int getDeliveryAttempts() {
        return deliveryAttempts;
    }

    public void setDeliveryAttempts(int deliveryAttempts) {
        this.deliveryAttempts = deliveryAttempts;
    }

    public String getDeliveryNotes() {
        return deliveryNotes;
    }

    public void setDeliveryNotes(String deliveryNotes) {
        this.deliveryNotes = deliveryNotes;
    }

    public DeliveryHistoryParcelDto getParcel() {
        return parcel;
    }

    public void setParcel(DeliveryHistoryParcelDto parcel) {
        this.parcel = parcel;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public List<HistoryTimelineEntryDto> getTimeline() {
        return timeline;
    }

    public void setTimeline(List<HistoryTimelineEntryDto> timeline) {
        this.timeline = timeline;
    }
}

