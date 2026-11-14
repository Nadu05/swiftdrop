package com.swiftdrop.organization.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Collections;
import java.util.List;

/**
 * Validates JWT tokens issued by the SwiftDrop Identity Service.
 */
@Service
public class OrganizationJwtService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationJwtService.class);
    public static final String EXPECTED_ISSUER = "swiftdrop-identity-service";

    @Value("${app.jwt.secret:Y2hhbmdlLW1lLWluLXByb2R1Y3Rpb24tYW5kLXVzZS1hLXN0cm9uZy1zZWNyZXQtaGVyZS0xMjM0NTY3ODk=}")
    private String jwtSecret;

    public OrganizationUserPrincipal parseToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey())
                    .requireIssuer(EXPECTED_ISSUER)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String userId = claims.get("userId", String.class);
            if (userId == null || userId.isBlank()) {
                userId = claims.getSubject();
            }

            String email = claims.get("email", String.class);
            if (email == null || email.isBlank()) {
                email = claims.getSubject();
            }

            @SuppressWarnings("unchecked")
            List<String> roles = claims.get("roles", List.class);
            if (roles == null) {
                roles = Collections.emptyList();
            }

            Long branchId = extractLongClaim(claims, "branchId");
            String organizationId = claims.get("organizationId", String.class);
            if (organizationId == null) {
                organizationId = claims.get("orgId", String.class);
            }

            return new OrganizationUserPrincipal(userId, email, roles, branchId, organizationId);
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Invalid JWT token in organization-service: {}", ex.getMessage());
            return null;
        }
    }

    private Long extractLongClaim(Claims claims, String claimName) {
        Object raw = claims.get(claimName);
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
