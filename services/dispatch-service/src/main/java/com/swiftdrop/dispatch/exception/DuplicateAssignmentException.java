package com.swiftdrop.dispatch.exception;

/**
 * Exception thrown when attempting to assign an order that already has an active courier assignment.
 */
public class DuplicateAssignmentException extends RuntimeException {

    public DuplicateAssignmentException(String message) {
        super(message);
    }

    public DuplicateAssignmentException(String message, Throwable cause) {
        super(message, cause);
    }
}

