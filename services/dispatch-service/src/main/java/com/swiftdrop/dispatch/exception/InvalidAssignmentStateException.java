package com.swiftdrop.dispatch.exception;

/**
 * Exception thrown when an operation is requested on an assignment whose current status
 * does not permit the transition (e.g. attempting to reassign a DELIVERED or CANCELLED assignment).
 */
public class InvalidAssignmentStateException extends IllegalStateException {

    public InvalidAssignmentStateException(String message) {
        super(message);
    }
}

