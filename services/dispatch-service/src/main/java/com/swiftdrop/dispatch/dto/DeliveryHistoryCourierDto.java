package com.swiftdrop.dispatch.dto;

public class DeliveryHistoryCourierDto {

    private String id;
    private String name;
    private String code;
    private String vehiclePlate;
    private String phone;

    public DeliveryHistoryCourierDto() {}

    public DeliveryHistoryCourierDto(String id, String name, String code, String vehiclePlate, String phone) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.vehiclePlate = vehiclePlate;
        this.phone = phone;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getVehiclePlate() {
        return vehiclePlate;
    }

    public void setVehiclePlate(String vehiclePlate) {
        this.vehiclePlate = vehiclePlate;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}

