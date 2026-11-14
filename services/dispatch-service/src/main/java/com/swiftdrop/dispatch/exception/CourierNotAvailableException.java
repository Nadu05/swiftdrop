package com.swiftdrop.dispatch.exception;

/**
 * Exception thrown when a courier cannot accept an assignment because they are
 * offline, busy, or have reached their maximum delivery capacity.
 */
public class CourierNotAvailableException extends RuntimeException {

    public CourierNotAvailableException(String message) {
        super(message);
    }

    public CourierNotAvailableException(String message, Throwable cause) {
        super(message, cause);
    }
}

