package com.swiftdrop.dispatch.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CourierProfileDto {
    private String id;
    private Long numericId;
    private String courierCode;
    private String userId;
    private String name;
    private String phone;
    private String email;
    private String status;
    private String vehicleType;
    private String vehiclePlate;
    private Long branchId;
    private String branchCode;
    private String branchName;
    private String zone;
    private int activeDeliveries;
    private int maxCapacity;
    private int completedToday;
    private int totalCompletedLifetime;
    private BigDecimal rating;
    private String shiftStart;
    private String lastActive;
    private boolean isEligible = true;
    private String ineligibilityReason;
    private List<AssignedOrderItemDto> assignedOrders = new ArrayList<>();

    public CourierProfileDto() {
    }

    public static class AssignedOrderItemDto {
        private String orderId;
        private String trackingNumber;
        private String destination;
        private String priority;
        private String status;
        private String assignedTime;

        public AssignedOrderItemDto() {
        }

        public AssignedOrderItemDto(
                String orderId,
                String trackingNumber,
                String destination,
                String priority,
                String status,
                String assignedTime) {
            this.orderId = orderId;
            this.trackingNumber = trackingNumber;
            this.destination = destination;
            this.priority = priority;
            this.status = status;
            this.assignedTime = assignedTime;
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

        public String getDestination() {
            return destination;
        }

        public void setDestination(String destination) {
            this.destination = destination;
        }

        public String getPriority() {
            return priority;
        }

        public void setPriority(String priority) {
            this.priority = priority;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getAssignedTime() {
            return assignedTime;
        }

        public void setAssignedTime(String assignedTime) {
            this.assignedTime = assignedTime;
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Long getNumericId() {
        return numericId;
    }

    public void setNumericId(Long numericId) {
        this.numericId = numericId;
    }

    public String getCourierCode() {
        return courierCode;
    }

    public void setCourierCode(String courierCode) {
        this.courierCode = courierCode;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehiclePlate() {
        return vehiclePlate;
    }

    public void setVehiclePlate(String vehiclePlate) {
        this.vehiclePlate = vehiclePlate;
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

    public String getZone() {
        return zone;
    }

    public void setZone(String zone) {
        this.zone = zone;
    }

    public int getActiveDeliveries() {
        return activeDeliveries;
    }

    public void setActiveDeliveries(int activeDeliveries) {
        this.activeDeliveries = activeDeliveries;
    }

    public int getMaxCapacity() {
        return maxCapacity;
    }

    public void setMaxCapacity(int maxCapacity) {
        this.maxCapacity = maxCapacity;
    }

    public int getCompletedToday() {
        return completedToday;
    }

    public void setCompletedToday(int completedToday) {
        this.completedToday = completedToday;
    }

    public int getTotalCompletedLifetime() {
        return totalCompletedLifetime;
    }

    public void setTotalCompletedLifetime(int totalCompletedLifetime) {
        this.totalCompletedLifetime = totalCompletedLifetime;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public void setRating(BigDecimal rating) {
        this.rating = rating;
    }

    public String getShiftStart() {
        return shiftStart;
    }

    public void setShiftStart(String shiftStart) {
        this.shiftStart = shiftStart;
    }

    public String getLastActive() {
        return lastActive;
    }

    public void setLastActive(String lastActive) {
        this.lastActive = lastActive;
    }

    public boolean getIsEligible() {
        return isEligible;
    }

    public void setIsEligible(boolean eligible) {
        isEligible = eligible;
    }

    public String getIneligibilityReason() {
        return ineligibilityReason;
    }

    public void setIneligibilityReason(String ineligibilityReason) {
        this.ineligibilityReason = ineligibilityReason;
    }

    public List<AssignedOrderItemDto> getAssignedOrders() {
        return assignedOrders;
    }

    public void setAssignedOrders(List<AssignedOrderItemDto> assignedOrders) {
        this.assignedOrders = assignedOrders;
    }
}
