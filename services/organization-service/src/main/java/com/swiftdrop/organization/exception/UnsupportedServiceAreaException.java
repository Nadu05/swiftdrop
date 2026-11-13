package com.swiftdrop.organization.exception;

/**
 * Thrown when a parcel pickup or destination location falls outside all active branch service areas.
 * Handled by GlobalExceptionHandler to return HTTP 422 Unprocessable Entity.
 */
public class UnsupportedServiceAreaException extends RuntimeException {

    private final String locationType;

    public UnsupportedServiceAreaException(String message) {
        super(message);
        this.locationType = null;
    }

    public UnsupportedServiceAreaException(double latitude, double longitude) {
        super(String.format("Pickup location (latitude: %.6f, longitude: %.6f) is not supported by any active branch service area",
                latitude, longitude));
        this.locationType = "PICKUP";
    }

    public UnsupportedServiceAreaException(String locationType, double latitude, double longitude) {
        super(String.format("%s location (latitude: %.6f, longitude: %.6f) is not supported by any active branch service area",
                "DESTINATION".equalsIgnoreCase(locationType) ? "Destination" : "Pickup",
                latitude, longitude));
        this.locationType = locationType != null ? locationType.toUpperCase() : "PICKUP";
    }

    public String getLocationType() {
        return locationType;
    }
}
