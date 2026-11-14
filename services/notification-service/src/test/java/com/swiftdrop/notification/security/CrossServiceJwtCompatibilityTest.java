package com.swiftdrop.notification.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CrossServiceJwtCompatibilityTest {

    private static final String ALIGNED_BASE64_SECRET =
            "Y2hhbmdlLW1lLWluLXByb2R1Y3Rpb24tYW5kLXVzZS1hLXN0cm9uZy1zZWNyZXQtaGVyZS0xMjM0NTY3ODk=";

    private static final String ENV_EXAMPLE_RAW_SECRET =
            "LqGNrUIqkMSHFLbEriynybtuXfmPa2yH8Q64GYK1dDB";

    @Test
    void identityIssuedTokensVerifyWithAlignedDefaultAndEnvExampleNonBase64Secrets() throws Exception {
        for (String secret : List.of(ALIGNED_BASE64_SECRET, ENV_EXAMPLE_RAW_SECRET)) {
            NotificationJwtService verifier = new NotificationJwtService(secret);
            String token = mintIdentityToken(secret, "usr-cust-10", "customer@swiftdrop.lk",
                    List.of("CUSTOMER", "MERCHANT"), 3600_000L);

            assertThat(verifier.validateToken(token)).isTrue();
            NotificationUserPrincipal principal = verifier.parsePrincipal(token);
            assertThat(principal.userId()).isEqualTo("usr-cust-10");
            assertThat(principal.email()).isEqualTo("customer@swiftdrop.lk");
            assertThat(principal.roles()).containsExactly("CUSTOMER", "MERCHANT");
            assertThat(principal.branchId()).isEqualTo(1L);
        }
    }

    @Test
    void expiredOrMismatchedSecretOrWrongIssuerTokensAreRejected() throws Exception {
        NotificationJwtService verifier = new NotificationJwtService(ALIGNED_BASE64_SECRET);
        String wrongSecretToken = mintIdentityToken(ENV_EXAMPLE_RAW_SECRET, "usr-1", "u1@swiftdrop.lk",
                List.of("ADMIN"), 3600_000L, "swiftdrop-identity-service");
        String expiredToken = mintIdentityToken(ALIGNED_BASE64_SECRET, "usr-1", "u1@swiftdrop.lk",
                List.of("ADMIN"), -10_000L, "swiftdrop-identity-service");
        String wrongIssuerToken = mintIdentityToken(ALIGNED_BASE64_SECRET, "usr-1", "u1@swiftdrop.lk",
                List.of("ADMIN"), 3600_000L, "forged-issuer");

        assertThat(verifier.validateToken(wrongSecretToken)).isFalse();
        assertThat(verifier.validateToken(expiredToken)).isFalse();
        assertThat(verifier.validateToken(wrongIssuerToken)).isFalse();
    }

    private static String mintIdentityToken(
            String secret,
            String userId,
            String email,
            List<String> roles,
            long ttlMs) throws Exception {
        return mintIdentityToken(secret, userId, email, roles, ttlMs, "swiftdrop-identity-service");
    }

    /**
     * Exact mirror of Identity Service {@code JwtService.signingKey()} key derivation
     * (Base64 decode with SHA-256 fallback if decoding fails or yields < 32 bytes).
     */
    private static String mintIdentityToken(
            String secret,
            String userId,
            String email,
            List<String> roles,
            long ttlMs,
            String issuer) throws Exception {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
            if (keyBytes.length < 32) {
                keyBytes = MessageDigest.getInstance("SHA-256")
                        .digest(secret.getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception ex) {
            keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
        }
        SecretKey key = Keys.hmacShaKeyFor(keyBytes);
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .issuer(issuer)
                .subject(userId)
                .claim("email", email)
                .claim("roles", roles)
                .claim("branchId", 1L)
                .claim("organizationId", "org-77")
                .issuedAt(new Date(now - 60_000L))
                .expiration(new Date(now + ttlMs))
                .signWith(key)
                .compact();
    }
}

