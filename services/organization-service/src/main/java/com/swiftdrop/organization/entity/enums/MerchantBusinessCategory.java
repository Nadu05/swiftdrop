package com.swiftdrop.organization.entity.enums;

public enum MerchantBusinessCategory {
    GROCERY_FOOD("Grocery / Food"),
    PHARMACY("Pharmacy & Wellness"),
    RETAIL("Retail & Fashion"),
    OTHER("Other / General");

    private final String label;

    MerchantBusinessCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}

