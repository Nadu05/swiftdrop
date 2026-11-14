package com.swiftdrop.dispatch.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;

@Component
public class DispatchJwtService {

    private final SecretKey signingKey;

    public DispatchJwtService(
            @Value("${app.jwt.secret:swiftdrop-super-secret-jwt-key-must-be-at-least-32-bytes-long-2026}") String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public DispatchUserPrincipal extractPrincipal(String token, Long headerBranchIdOverride) {
        Claims claims = parseToken(token);
        String userId = claims.getSubject();
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

        Long branchId = headerBranchIdOverride;
        if (branchId == null) {
            Object branchObj = claims.get("branchId");
            if (branchObj instanceof Number num) {
                branchId = num.longValue();
            } else if (branchObj instanceof String str && !str.isBlank()) {
                try {
                    branchId = Long.parseLong(str.trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }

        return new DispatchUserPrincipal(userId, email, roles, branchId);
    }

    public String generateInternalServiceToken(String actorId, String actorRole) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(actorId != null ? actorId : "dispatch-service")
                .claim("email", "dispatch-service@swiftdrop.internal")
                .claim("roles", List.of(actorRole != null ? actorRole : "DISPATCHER", "ADMIN"))
                .issuedAt(new Date(now))
                .expiration(new Date(now + 300_000L))
                .signWith(signingKey)
                .compact();
    }
}
