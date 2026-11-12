package com.swiftdrop.identity.exception;

/**
 * Thrown when an OAuth provider returns an invalid or unverifiable response.
 */
public class OAuthException extends RuntimeException {

    public OAuthException(String message) {
        super(message);
    }
}

