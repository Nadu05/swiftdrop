package com.swiftdrop.dispatch.dto;

public class FailureDetailsDto {

    private String reason;
    private String attemptTimestamp;
    private String courierNotes;
    private int attemptsCount;

    public FailureDetailsDto() {}

    public FailureDetailsDto(String reason, String attemptTimestamp, String courierNotes, int attemptsCount) {
        this.reason = reason;
        this.attemptTimestamp = attemptTimestamp;
        this.courierNotes = courierNotes;
        this.attemptsCount = attemptsCount;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getAttemptTimestamp() {
        return attemptTimestamp;
    }

    public void setAttemptTimestamp(String attemptTimestamp) {
        this.attemptTimestamp = attemptTimestamp;
    }

    public String getCourierNotes() {
        return courierNotes;
    }

    public void setCourierNotes(String courierNotes) {
        this.courierNotes = courierNotes;
    }

    public int getAttemptsCount() {
        return attemptsCount;
    }

    public void setAttemptsCount(int attemptsCount) {
        this.attemptsCount = attemptsCount;
    }
}

