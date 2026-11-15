package com.swiftdrop.dispatch.exception;

/** Thrown when an Idempotency-Key is reused for a different request, or is still being processed. */
public class IdempotencyConflictException extends RuntimeException {
    public IdempotencyConflictException(String message) {
        super(message);
    }
}
