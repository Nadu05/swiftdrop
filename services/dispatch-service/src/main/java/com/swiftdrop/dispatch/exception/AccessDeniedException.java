package com.swiftdrop.dispatch.exception;

/**
 * Exception thrown when an authenticated user does not possess the permissions
 * or ownership rights required to access or modify a resource (HTTP 403 Forbidden).
 */
public class AccessDeniedException extends RuntimeException {

    public AccessDeniedException(String message) {
        super(message);
    }
}

