package com.swiftdrop.organization.exception;

/**
 * Thrown when a parcel pickup location falls outside all active branch service areas.
 * Handled by GlobalExceptionHandler to return HTTP 422 Unprocessable Entity.
 */
public class UnsupportedServiceAreaException extends RuntimeException {

    public UnsupportedServiceAreaException(String message) {
        super(message);
    }

    public UnsupportedServiceAreaException(double latitude, double longitude) {
        super(String.format("Pickup location (latitude: %.6f, longitude: %.6f) is not supported by any active branch service area",
                latitude, longitude));
    }
}

