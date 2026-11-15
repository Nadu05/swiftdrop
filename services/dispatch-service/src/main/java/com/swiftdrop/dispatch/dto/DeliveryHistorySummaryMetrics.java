package com.swiftdrop.dispatch.dto;

public class DeliveryHistorySummaryMetrics {

    private long totalDeliveries;
    private long successfullyDelivered;
    private long failedDeliveries;
    private long totalDeliveryAttempts;

    public DeliveryHistorySummaryMetrics() {}

    public DeliveryHistorySummaryMetrics(long totalDeliveries, long successfullyDelivered,
                                         long failedDeliveries, long totalDeliveryAttempts) {
        this.totalDeliveries = totalDeliveries;
        this.successfullyDelivered = successfullyDelivered;
        this.failedDeliveries = failedDeliveries;
        this.totalDeliveryAttempts = totalDeliveryAttempts;
    }

    public long getTotalDeliveries() {
        return totalDeliveries;
    }

    public void setTotalDeliveries(long totalDeliveries) {
        this.totalDeliveries = totalDeliveries;
    }

    public long getSuccessfullyDelivered() {
        return successfullyDelivered;
    }

    public void setSuccessfullyDelivered(long successfullyDelivered) {
        this.successfullyDelivered = successfullyDelivered;
    }

    public long getFailedDeliveries() {
        return failedDeliveries;
    }

    public void setFailedDeliveries(long failedDeliveries) {
        this.failedDeliveries = failedDeliveries;
    }

    public long getTotalDeliveryAttempts() {
        return totalDeliveryAttempts;
    }

    public void setTotalDeliveryAttempts(long totalDeliveryAttempts) {
        this.totalDeliveryAttempts = totalDeliveryAttempts;
    }
}

