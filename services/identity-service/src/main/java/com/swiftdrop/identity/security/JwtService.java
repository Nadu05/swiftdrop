package com.swiftdrop.identity.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Service for generating, parsing, and validating JWTs.
 * Uses HMAC-SHA256 with a Base64-encoded secret key from configuration.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    public static final String ISSUER = "swiftdrop-identity-service";
    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_USER_ID = "userId";
    private static final String CLAIM_BRANCH_ID = "branchId";
    private static final String CLAIM_ORGANIZATION_ID = "organizationId";

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.access-token-expiry-ms:900000}") // 15 minutes default
    private long accessTokenExpiryMs;

    @Value("${app.jwt.refresh-token-expiry-ms:604800000}") // 7 days default
    private long refreshTokenExpiryMs;

    // -----------------------------------------------------------------------
    // Token generation
    // -----------------------------------------------------------------------

    /**
     * Generates a signed access JWT for the given user.
     *
     * @param userId  the user's UUID (stored as the subject)
     * @param details Spring Security UserDetails (provides email and authorities)
     * @return signed JWT string
     */
    public String generateAccessToken(UUID userId, UserDetails details) {
        return generateAccessToken(userId, details, null, null);
    }

    /**
     * Generates a signed access JWT for the given user including optional branch and organization scope claims.
     */
    public String generateAccessToken(UUID userId, UserDetails details, Long branchId, String organizationId) {
        List<String> roles = details.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        JwtBuilder builder = Jwts.builder()
                .issuer(ISSUER)
                .subject(userId.toString())
                .claim(CLAIM_USER_ID, userId.toString())
                .claim("email", details.getUsername())
                .claim(CLAIM_ROLES, roles)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiryMs));

        if (branchId != null) {
            builder.claim(CLAIM_BRANCH_ID, branchId);
        }
        if (organizationId != null && !organizationId.isBlank()) {
            builder.claim(CLAIM_ORGANIZATION_ID, organizationId.trim());
        }

        return builder.signWith(signingKey()).compact();
    }

    /**
     * Generates a raw (unsigned, opaque) refresh token string.
     * The caller is responsible for hashing and persisting it.
     */
    public String generateRawRefreshToken() {
        return UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
    }

    public long getAccessTokenExpiryMs() {
        return accessTokenExpiryMs;
    }

    public long getRefreshTokenExpiryMs() {
        return refreshTokenExpiryMs;
    }

    // -----------------------------------------------------------------------
    // Token validation and extraction
    // -----------------------------------------------------------------------

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("JWT validation failed: {}", ex.getMessage());
            return false;
        }
    }

    public String extractUserId(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractEmail(String token) {
        return parseClaims(token).get("email", String.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        return parseClaims(token).get(CLAIM_ROLES, List.class);
    }

    public Long extractBranchId(String token) {
        Object raw = parseClaims(token).get(CLAIM_BRANCH_ID);
        if (raw instanceof Number number) {
            return number.longValue();
        }
        if (raw instanceof String str && !str.isBlank()) {
            try {
                return Long.parseLong(str.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    public String extractOrganizationId(String token) {
        return parseClaims(token).get(CLAIM_ORGANIZATION_ID, String.class);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .requireIssuer(ISSUER)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey signingKey() {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(jwtSecret);
            if (keyBytes.length < 32) {
                keyBytes = sha256Bytes(jwtSecret);
            }
        } catch (Exception ex) {
            keyBytes = sha256Bytes(jwtSecret);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private byte[] sha256Bytes(String value) {
        try {
            return java.security.MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
