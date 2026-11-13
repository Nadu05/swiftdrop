package com.swiftdrop.order.support;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/** Mints HS256 JWTs the same way the Identity service is expected to, for use in tests only. */
public final class TestTokens {

    /** Test-only secret (at least 256 bits, as HS256 requires). Never used outside tests. */
    public static final String SECRET = "test-only-secret-test-only-secret-1234567890";

    /** Test-only Dispatch service key (at least 32 characters). Never used outside tests. */
    public static final String SERVICE_KEY = "test-only-dispatch-key-0123456789-abcdef";

    private TestTokens() {
    }

    public static String customer(long userId) {
        return token(SECRET, String.valueOf(userId), "CUSTOMER", Instant.now().plusSeconds(3600));
    }

    /** A token for a non-customer user such as {@code COURIER}, {@code BRANCH_ADMIN} or {@code ADMIN}. */
    public static String withRole(long userId, String role) {
        return token(SECRET, String.valueOf(userId), role, Instant.now().plusSeconds(3600));
    }

    public static String token(String secret, String subject, String role, Instant expiresAt) {
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(subject)
                    .claim("role", role)
                    .issueTime(new Date())
                    .expirationTime(Date.from(expiresAt))
                    .build();
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
            return jwt.serialize();
        } catch (JOSEException ex) {
            throw new IllegalStateException("Could not sign test token", ex);
        }
    }
}
