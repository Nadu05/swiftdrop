package com.swiftdrop.dispatch.exception;

/**
 * Exception thrown when an external downstream microservice (such as Order Service)
 * is unreachable, times out, or fails to respond.
 */
public class ServiceUnavailableException extends RuntimeException {

    public ServiceUnavailableException(String message) {
        super(message);
    }

    public ServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}

