package com.swiftdrop.identity.exception;

/**
 * Thrown when email/password credentials are invalid.
 * Uses a generic message to avoid credential enumeration.
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Invalid email or password");
    }
}

