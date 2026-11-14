package com.swiftdrop.order.dto;

import jakarta.validation.constraints.NotBlank;

public class PaymentConfirmationRequest {

    @NotBlank(message = "External transaction reference is required")
    private String externalTransactionRef;

    private String gatewayProvider = "PROVISIONAL_PAYMENT_GATEWAY";
    private String notes;

    public PaymentConfirmationRequest() {
    }

    public PaymentConfirmationRequest(String externalTransactionRef, String gatewayProvider, String notes) {
        this.externalTransactionRef = externalTransactionRef;
        this.gatewayProvider = gatewayProvider;
        this.notes = notes;
    }

    public String getExternalTransactionRef() {
        return externalTransactionRef;
    }

    public void setExternalTransactionRef(String externalTransactionRef) {
        this.externalTransactionRef = externalTransactionRef;
    }

    public String getGatewayProvider() {
        return gatewayProvider;
    }

    public void setGatewayProvider(String gatewayProvider) {
        this.gatewayProvider = gatewayProvider;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

