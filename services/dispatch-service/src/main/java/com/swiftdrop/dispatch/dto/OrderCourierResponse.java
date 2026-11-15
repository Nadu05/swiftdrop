package com.swiftdrop.dispatch.dto;

import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.VehicleType;

/**
 * The courier currently assigned to an order, with the contact details a customer needs to reach them.
 */
public class OrderCourierResponse {

    private Long courierId;
    private String name;
    private String phone;
    private VehicleType vehicleType;
    private String vehiclePlate;
    private AssignmentStatus assignmentStatus;

    public OrderCourierResponse() {
    }

    public OrderCourierResponse(Long courierId, String name, String phone, VehicleType vehicleType,
                                String vehiclePlate, AssignmentStatus assignmentStatus) {
        this.courierId = courierId;
        this.name = name;
        this.phone = phone;
        this.vehicleType = vehicleType;
        this.vehiclePlate = vehiclePlate;
        this.assignmentStatus = assignmentStatus;
    }

    public static OrderCourierResponse of(Assignment assignment) {
        Courier courier = assignment.getCourier();
        return new OrderCourierResponse(courier.getId(), courier.getName(), courier.getPhone(),
                courier.getVehicleType(), courier.getVehiclePlate(), assignment.getStatus());
    }

    public Long getCourierId() {
        return courierId;
    }

    public void setCourierId(Long courierId) {
        this.courierId = courierId;
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

    public VehicleType getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(VehicleType vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehiclePlate() {
        return vehiclePlate;
    }

    public void setVehiclePlate(String vehiclePlate) {
        this.vehiclePlate = vehiclePlate;
    }

    public AssignmentStatus getAssignmentStatus() {
        return assignmentStatus;
    }

    public void setAssignmentStatus(AssignmentStatus assignmentStatus) {
        this.assignmentStatus = assignmentStatus;
    }
}
