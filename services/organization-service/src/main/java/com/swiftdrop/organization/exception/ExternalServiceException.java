package com.swiftdrop.organization.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when an upstream microservice call fails or is unavailable.
 */
public class ExternalServiceException extends RuntimeException {

    private final HttpStatus status;

    public ExternalServiceException(String message) {
        this(HttpStatus.SERVICE_UNAVAILABLE, message, null);
    }

    public ExternalServiceException(String message, Throwable cause) {
        this(HttpStatus.SERVICE_UNAVAILABLE, message, cause);
    }

    public ExternalServiceException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
