package com.swiftdrop.order.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Safe public tracking response.
 * Exposes ONLY non-sensitive shipment milestones and area/branch names.
 * Never exposes private phone numbers, emails, customer IDs, or street door numbers.
 */
public class PublicTrackingResponse {

    private String trackingNumber;
    private String status;
    private String statusLabel;
    private String origin;
    private String destination;
    private String parcelCategory;
    private String estimatedDelivery;
    private String branch;
    private String destinationBranch;
    private BigDecimal distanceKm;
    private String updatedAt;
    private List<PublicTrackingEventDto> events;

    public static class PublicTrackingEventDto {
        private String status;
        private String statusLabel;
        private String timestamp;
        private String location;
        private String description;

        public PublicTrackingEventDto() {
        }

        public PublicTrackingEventDto(
                String status,
                String statusLabel,
                String timestamp,
                String location,
                String description) {
            this.status = status;
            this.statusLabel = statusLabel;
            this.timestamp = timestamp;
            this.location = location;
            this.description = description;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getStatusLabel() {
            return statusLabel;
        }

        public void setStatusLabel(String statusLabel) {
            this.statusLabel = statusLabel;
        }

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
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
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStatusLabel() {
        return statusLabel;
    }

    public void setStatusLabel(String statusLabel) {
        this.statusLabel = statusLabel;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getParcelCategory() {
        return parcelCategory;
    }

    public void setParcelCategory(String parcelCategory) {
        this.parcelCategory = parcelCategory;
    }

    public String getEstimatedDelivery() {
        return estimatedDelivery;
    }

    public void setEstimatedDelivery(String estimatedDelivery) {
        this.estimatedDelivery = estimatedDelivery;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getDestinationBranch() {
        return destinationBranch;
    }

    public void setDestinationBranch(String destinationBranch) {
        this.destinationBranch = destinationBranch;
    }

    public BigDecimal getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(BigDecimal distanceKm) {
        this.distanceKm = distanceKm;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<PublicTrackingEventDto> getEvents() {
        return events;
    }

    public void setEvents(List<PublicTrackingEventDto> events) {
        this.events = events;
    }
}

