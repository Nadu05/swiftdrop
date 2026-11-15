package com.swiftdrop.dispatch.dto;

public class HistoryTimelineEntryDto {

    private String id;
    private String stage;
    private String timestamp;
    private String description;
    private String performedBy;

    public HistoryTimelineEntryDto() {}

    public HistoryTimelineEntryDto(String id, String stage, String timestamp, String description, String performedBy) {
        this.id = id;
        this.stage = stage;
        this.timestamp = timestamp;
        this.description = description;
        this.performedBy = performedBy;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStage() {
        return stage;
    }

    public void setStage(String stage) {
        this.stage = stage;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }
}

