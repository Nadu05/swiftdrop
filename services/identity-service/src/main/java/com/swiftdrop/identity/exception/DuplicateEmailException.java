package com.swiftdrop.identity.exception;

/**
 * Thrown when registration is attempted with an email that already exists.
 */
public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException(String email) {
        super("An account with email '" + email + "' already exists");
    }
}

