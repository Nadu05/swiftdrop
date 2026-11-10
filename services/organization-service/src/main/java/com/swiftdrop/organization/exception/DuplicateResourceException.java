package com.swiftdrop.organization.exception;

/**
 * Thrown when an attempt is made to create or update a resource
 * with a value that conflicts with an existing record (e.g. duplicate branch code).
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}

