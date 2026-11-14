package com.swiftdrop.order.exception;

public class InvalidBranchCoverageException extends RuntimeException {

    private final String locationType;

    public InvalidBranchCoverageException(String message, String locationType) {
        super(message);
        this.locationType = locationType != null ? locationType : "PICKUP";
    }

    public String getLocationType() {
        return locationType;
    }
}

