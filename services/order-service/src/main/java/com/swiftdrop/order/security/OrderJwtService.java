package com.swiftdrop.order.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Service
public class OrderJwtService {

    public static final String EXPECTED_ISSUER = "swiftdrop-identity-service";

    private final SecretKey signingKey;

    public OrderJwtService(
            @Value("${app.jwt.secret:Y2hhbmdlLW1lLWluLXByb2R1Y3Rpb24tYW5kLXVzZS1hLXN0cm9uZy1zZWNyZXQtaGVyZS0xMjM0NTY3ODk=}") String jwtSecret) {
        this.signingKey = deriveSigningKey(jwtSecret);
    }

    private SecretKey deriveSigningKey(String secret) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
            if (keyBytes.length < 32) {
                keyBytes = sha256Bytes(secret);
            }
        } catch (Exception ex) {
            keyBytes = sha256Bytes(secret);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private byte[] sha256Bytes(String value) {
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public OrderUserPrincipal parsePrincipal(String token) {
        Claims claims = parseClaims(token);
        String userId = claims.get("userId", String.class);
        if (userId == null || userId.isBlank()) {
            userId = claims.getSubject();
        }
        String email = claims.get("email", String.class);
        String organizationId = claims.get("organizationId", String.class);
        if (organizationId == null) {
            organizationId = claims.get("orgId", String.class);
        }

        List<String> roles = new ArrayList<>();
        Object rawRoles = claims.get("roles");
        if (rawRoles instanceof Collection<?> collection) {
            for (Object item : collection) {
                if (item != null) {
                    roles.add(item.toString());
                }
            }
        } else if (rawRoles instanceof String singleRole && !singleRole.isBlank()) {
            roles.add(singleRole.trim());
        }

        Long branchId = extractLongClaim(claims, "branchId");

        List<String> scopes = new ArrayList<>();
        Object rawScope = claims.get("scope");
        if (rawScope instanceof Collection<?> collection) {
            for (Object item : collection) {
                if (item != null) scopes.add(item.toString());
            }
        } else if (rawScope instanceof String scopeStr && !scopeStr.isBlank()) {
            for (String tokenScope : scopeStr.trim().split("\\s+")) {
                if (!tokenScope.isBlank()) scopes.add(tokenScope);
            }
        }

        return new OrderUserPrincipal(userId, email, organizationId, roles, branchId, scopes);
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

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(EXPECTED_ISSUER)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
