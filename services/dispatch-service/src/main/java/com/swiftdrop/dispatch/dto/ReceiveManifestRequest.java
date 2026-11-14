package com.swiftdrop.dispatch.dto;

import java.util.ArrayList;
import java.util.List;

public class ReceiveManifestRequest {

    private List<String> receivedOrderIds = new ArrayList<>();
    private List<String> missingOrderIds = new ArrayList<>();
    private List<ParcelConditionItem> damagedParcels = new ArrayList<>();
    private List<ParcelVerificationItem> parcelVerifications = new ArrayList<>();
    private String discrepancyNotes;
    private String notes;

    public ReceiveManifestRequest() {
    }

    public List<String> getReceivedOrderIds() {
        return receivedOrderIds;
    }

    public void setReceivedOrderIds(List<String> receivedOrderIds) {
        this.receivedOrderIds = receivedOrderIds;
    }

    public List<String> getMissingOrderIds() {
        return missingOrderIds;
    }

    public void setMissingOrderIds(List<String> missingOrderIds) {
        this.missingOrderIds = missingOrderIds;
    }

    public List<ParcelConditionItem> getDamagedParcels() {
        return damagedParcels;
    }

    public void setDamagedParcels(List<ParcelConditionItem> damagedParcels) {
        this.damagedParcels = damagedParcels;
    }

    public List<ParcelVerificationItem> getParcelVerifications() {
        return parcelVerifications;
    }

    public void setParcelVerifications(List<ParcelVerificationItem> parcelVerifications) {
        this.parcelVerifications = parcelVerifications;
    }

    public String getDiscrepancyNotes() {
        return discrepancyNotes;
    }

    public void setDiscrepancyNotes(String discrepancyNotes) {
        this.discrepancyNotes = discrepancyNotes;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public static class ParcelConditionItem {
        private String parcelKey;
        private String discrepancyNotes;
        private String evidenceReference;

        public String getParcelKey() {
            return parcelKey;
        }

        public void setParcelKey(String parcelKey) {
            this.parcelKey = parcelKey;
        }

        public String getDiscrepancyNotes() {
            return discrepancyNotes;
        }

        public void setDiscrepancyNotes(String discrepancyNotes) {
            this.discrepancyNotes = discrepancyNotes;
        }

        public String getEvidenceReference() {
            return evidenceReference;
        }

        public void setEvidenceReference(String evidenceReference) {
            this.evidenceReference = evidenceReference;
        }
    }

    public static class ParcelVerificationItem {
        private String parcelKey;
        private String status;
        private String discrepancyNotes;
        private String evidenceReference;

        public String getParcelKey() {
            return parcelKey;
        }

        public void setParcelKey(String parcelKey) {
            this.parcelKey = parcelKey;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getDiscrepancyNotes() {
            return discrepancyNotes;
        }

        public void setDiscrepancyNotes(String discrepancyNotes) {
            this.discrepancyNotes = discrepancyNotes;
        }

        public String getEvidenceReference() {
            return evidenceReference;
        }

        public void setEvidenceReference(String evidenceReference) {
            this.evidenceReference = evidenceReference;
        }
    }
}

