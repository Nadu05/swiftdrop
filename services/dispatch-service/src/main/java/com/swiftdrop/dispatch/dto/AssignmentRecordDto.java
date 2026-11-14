package com.swiftdrop.dispatch.dto;

import java.util.ArrayList;
import java.util.List;

public class AssignmentRecordDto {
    private Long id;
    private String assignmentId;
    private String assignmentCode;
    private String taskType;
    private Long pickupTaskId;
    private Long deliveryJobId;
    private String orderId;
    private String trackingNumber;
    private Long branchId;
    private String branchCode;
    private String branchName;
    private String courierId;
    private CourierSummaryDto courier;
    private DeliveryJobDto.RecipientDto recipient;
    private String merchantName;
    private String assignedDate;
    private String assignedAt;
    private String deliveryStatus;
    private String status;
    private String priority;
    private int deliveryAttempts;
    private String notes;
    private List<AssignmentHistoryEntryDto> history = new ArrayList<>();

    public AssignmentRecordDto() {
    }

    public static class CourierSummaryDto {
        private String id;
        private String code;
        private String name;
        private String phone;
        private String vehicle;

        public CourierSummaryDto() {
        }

        public CourierSummaryDto(String id, String code, String name, String phone, String vehicle) {
            this.id = id;
            this.code = code;
            this.name = name;
            this.phone = phone;
            this.vehicle = vehicle;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getVehicle() {
            return vehicle;
        }

        public void setVehicle(String vehicle) {
            this.vehicle = vehicle;
        }
    }

    public static class AssignmentHistoryEntryDto {
        private String id;
        private String timestamp;
        private String fromCourierName;
        private String toCourierName;
        private String reason;
        private String assignedBy;

        public AssignmentHistoryEntryDto() {
        }

        public AssignmentHistoryEntryDto(
                String id,
                String timestamp,
                String fromCourierName,
                String toCourierName,
                String reason,
                String assignedBy) {
            this.id = id;
            this.timestamp = timestamp;
            this.fromCourierName = fromCourierName;
            this.toCourierName = toCourierName;
            this.reason = reason;
            this.assignedBy = assignedBy;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }

        public String getFromCourierName() {
            return fromCourierName;
        }

        public void setFromCourierName(String fromCourierName) {
            this.fromCourierName = fromCourierName;
        }

        public String getToCourierName() {
            return toCourierName;
        }

        public void setToCourierName(String toCourierName) {
            this.toCourierName = toCourierName;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }

        public String getAssignedBy() {
            return assignedBy;
        }

        public void setAssignedBy(String assignedBy) {
            this.assignedBy = assignedBy;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(String assignmentId) {
        this.assignmentId = assignmentId;
    }

    public String getAssignmentCode() {
        return assignmentCode;
    }

    public void setAssignmentCode(String assignmentCode) {
        this.assignmentCode = assignmentCode;
    }

    public String getTaskType() {
        return taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }

    public Long getPickupTaskId() {
        return pickupTaskId;
    }

    public void setPickupTaskId(Long pickupTaskId) {
        this.pickupTaskId = pickupTaskId;
    }

    public Long getDeliveryJobId() {
        return deliveryJobId;
    }

    public void setDeliveryJobId(Long deliveryJobId) {
        this.deliveryJobId = deliveryJobId;
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

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public String getCourierId() {
        return courierId;
    }

    public void setCourierId(String courierId) {
        this.courierId = courierId;
    }

    public CourierSummaryDto getCourier() {
        return courier;
    }

    public void setCourier(CourierSummaryDto courier) {
        this.courier = courier;
    }

    public DeliveryJobDto.RecipientDto getRecipient() {
        return recipient;
    }

    public void setRecipient(DeliveryJobDto.RecipientDto recipient) {
        this.recipient = recipient;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public String getAssignedDate() {
        return assignedDate;
    }

    public void setAssignedDate(String assignedDate) {
        this.assignedDate = assignedDate;
    }

    public String getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(String assignedAt) {
        this.assignedAt = assignedAt;
    }

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public void setDeliveryStatus(String deliveryStatus) {
        this.deliveryStatus = deliveryStatus;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public int getDeliveryAttempts() {
        return deliveryAttempts;
    }

    public void setDeliveryAttempts(int deliveryAttempts) {
        this.deliveryAttempts = deliveryAttempts;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<AssignmentHistoryEntryDto> getHistory() {
        return history;
    }

    public void setHistory(List<AssignmentHistoryEntryDto> history) {
        this.history = history;
    }
}

