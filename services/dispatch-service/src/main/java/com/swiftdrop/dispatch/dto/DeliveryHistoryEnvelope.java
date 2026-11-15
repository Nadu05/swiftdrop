package com.swiftdrop.dispatch.dto;

import java.util.ArrayList;
import java.util.List;

public class DeliveryHistoryEnvelope {

    private List<DeliveryHistoryResponse> deliveries = new ArrayList<>();
    private DeliveryHistorySummaryMetrics metrics;

    public DeliveryHistoryEnvelope() {}

    public DeliveryHistoryEnvelope(List<DeliveryHistoryResponse> deliveries, DeliveryHistorySummaryMetrics metrics) {
        this.deliveries = deliveries != null ? deliveries : new ArrayList<>();
        this.metrics = metrics;
    }

    public List<DeliveryHistoryResponse> getDeliveries() {
        return deliveries;
    }

    public void setDeliveries(List<DeliveryHistoryResponse> deliveries) {
        this.deliveries = deliveries;
    }

    public DeliveryHistorySummaryMetrics getMetrics() {
        return metrics;
    }

    public void setMetrics(DeliveryHistorySummaryMetrics metrics) {
        this.metrics = metrics;
    }
}

