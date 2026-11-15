package com.swiftdrop.dispatch.dto;

public class DeliveryHistoryParcelDto {

    private String category;
    private String weight;

    public DeliveryHistoryParcelDto() {}

    public DeliveryHistoryParcelDto(String category, String weight) {
        this.category = category;
        this.weight = weight;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getWeight() {
        return weight;
    }

    public void setWeight(String weight) {
        this.weight = weight;
    }
}

