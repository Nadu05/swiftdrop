package com.swiftdrop.dispatch.dto;

import java.util.ArrayList;
import java.util.List;

public class AddManifestParcelsRequest {

    private List<String> parcelKeys = new ArrayList<>();
    private List<String> orderIds = new ArrayList<>();
    private List<String> trackingNumbers = new ArrayList<>();

    public AddManifestParcelsRequest() {
    }

    public List<String> getParcelKeys() {
        return parcelKeys;
    }

    public void setParcelKeys(List<String> parcelKeys) {
        this.parcelKeys = parcelKeys;
    }

    public List<String> getOrderIds() {
        return orderIds;
    }

    public void setOrderIds(List<String> orderIds) {
        this.orderIds = orderIds;
    }

    public List<String> getTrackingNumbers() {
        return trackingNumbers;
    }

    public void setTrackingNumbers(List<String> trackingNumbers) {
        this.trackingNumbers = trackingNumbers;
    }
}

