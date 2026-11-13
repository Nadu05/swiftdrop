package com.swiftdrop.dispatch.dto;

/**
 * DTO representing parcel details for frontend delivery views.
 */
public class ParcelInfoDto {

    private Double weightKg;
    private String packageType;
    private String dimensions;
    private String handlingNotes;

    public ParcelInfoDto() {
    }

    public ParcelInfoDto(Double weightKg, String packageType, String dimensions, String handlingNotes) {
        this.weightKg = weightKg;
        this.packageType = packageType;
        this.dimensions = dimensions;
        this.handlingNotes = handlingNotes;
    }

    public Double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Double weightKg) {
        this.weightKg = weightKg;
    }

    public String getPackageType() {
        return packageType;
    }

    public void setPackageType(String packageType) {
        this.packageType = packageType;
    }

    public String getDimensions() {
        return dimensions;
    }

    public void setDimensions(String dimensions) {
        this.dimensions = dimensions;
    }

    public String getHandlingNotes() {
        return handlingNotes;
    }

    public void setHandlingNotes(String handlingNotes) {
        this.handlingNotes = handlingNotes;
    }
}

