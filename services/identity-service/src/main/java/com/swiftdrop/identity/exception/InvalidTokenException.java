package com.swiftdrop.identity.exception;

/**
 * Thrown when a JWT or refresh token is invalid, expired, or tampered.
 */
public class InvalidTokenException extends RuntimeException {

    public InvalidTokenException(String message) {
        super(message);
    }
}

