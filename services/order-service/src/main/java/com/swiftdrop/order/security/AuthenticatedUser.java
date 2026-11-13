package com.swiftdrop.order.security;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Resolves the caller's identity from the verified JWT. The user id always comes from the token
 * subject, never from request bodies or parameters.
 */
public final class AuthenticatedUser {

    private AuthenticatedUser() {
    }

    /**
     * @return the numeric Identity user id found in the token subject
     * @throws BadCredentialsException (mapped to HTTP 401) when the subject is missing or not numeric
     */
    public static long requireUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new BadCredentialsException("Token has no subject");
        }
        try {
            return Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException ex) {
            throw new BadCredentialsException("Token subject is not a valid user id");
        }
    }
}
