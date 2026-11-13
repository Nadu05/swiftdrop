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

    private TestTokens() {
    }

    public static String customer(long userId) {
        return token(SECRET, String.valueOf(userId), "CUSTOMER", Instant.now().plusSeconds(3600));
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
