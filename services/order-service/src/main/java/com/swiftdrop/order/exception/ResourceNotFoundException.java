package com.swiftdrop.order.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " not found with id: " + id);
    }

    /** For lookups where echoing an identifier back to the caller is undesirable. */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
