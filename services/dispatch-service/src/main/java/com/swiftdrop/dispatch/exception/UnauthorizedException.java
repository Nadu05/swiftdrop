package com.swiftdrop.dispatch.exception;

/**
 * Exception thrown when a request lacks valid authentication credentials (HTTP 401 Unauthorized).
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}

