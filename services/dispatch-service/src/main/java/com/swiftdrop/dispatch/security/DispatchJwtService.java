package com.swiftdrop.dispatch.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;

@Component
public class DispatchJwtService {

    public static final String EXPECTED_ISSUER = "swiftdrop-identity-service";

    private final SecretKey signingKey;

    public DispatchJwtService(
            @Value("${app.jwt.secret:Y2hhbmdlLW1lLWluLXByb2R1Y3Rpb24tYW5kLXVzZS1hLXN0cm9uZy1zZWNyZXQtaGVyZS0xMjM0NTY3ODk=}") String secret) {
        this.signingKey = deriveSigningKey(secret);
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

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(EXPECTED_ISSUER)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public DispatchUserPrincipal extractPrincipal(String token) {
        return extractPrincipal(token, null);
    }

    /**
     * Extracts the authenticated principal strictly from verified JWT claims.
     * Any external branchId override parameter is ignored to prevent X-Branch-Id spoofing.
     */
    public DispatchUserPrincipal extractPrincipal(String token, Long ignoredHeaderBranchIdOverride) {
        Claims claims = parseToken(token);
        String userId = claims.get("userId", String.class);
        if (userId == null || userId.isBlank()) {
            userId = claims.getSubject();
        }
        String email = claims.get("email", String.class);

        List<String> roles = new ArrayList<>();
        Object rolesClaim = claims.get("roles");
        if (rolesClaim instanceof Collection<?> list) {
            for (Object item : list) {
                if (item != null) {
                    roles.add(item.toString());
                }
            }
        } else if (rolesClaim instanceof String str && !str.isBlank()) {
            for (String part : str.split(",")) {
                roles.add(part.trim());
            }
        }
        Object roleClaim = claims.get("role");
        if (roleClaim instanceof String singleRole && !singleRole.isBlank() && roles.isEmpty()) {
            roles.add(singleRole.trim());
        }

        Long branchId = null;
        Object branchObj = claims.get("branchId");
        if (branchObj instanceof Number num) {
            branchId = num.longValue();
        } else if (branchObj instanceof String str && !str.isBlank()) {
            try {
                branchId = Long.parseLong(str.trim());
            } catch (NumberFormatException ignored) {
            }
        }

        return new DispatchUserPrincipal(userId, email, roles, branchId);
    }

    public String generateInternalServiceToken(String actorId, String actorRole) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .issuer(EXPECTED_ISSUER)
                .subject(actorId != null ? actorId : "dispatch-service")
                .claim("email", "dispatch-service@swiftdrop.internal")
                .claim("roles", List.of(actorRole != null ? actorRole : "DISPATCHER", "INTERNAL_SERVICE"))
                .issuedAt(new Date(now))
                .expiration(new Date(now + 300_000L))
                .signWith(signingKey)
                .compact();
    }
}
