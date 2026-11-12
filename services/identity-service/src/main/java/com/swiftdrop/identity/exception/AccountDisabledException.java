package com.swiftdrop.identity.exception;

/**
 * Thrown when a user account is not in ACTIVE status.
 */
public class AccountDisabledException extends RuntimeException {

    public AccountDisabledException() {
        super("Your account is not active. Please contact support.");
    }
}

