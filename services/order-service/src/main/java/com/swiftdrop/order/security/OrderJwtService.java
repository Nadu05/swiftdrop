package com.swiftdrop.order.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Service
public class OrderJwtService {

    private final SecretKey signingKey;

    public OrderJwtService(
            @Value("${app.jwt.secret:swiftdrop-super-secret-jwt-key-must-be-at-least-32-bytes-long-2026}") String jwtSecret) {
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
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
        String userId = claims.getSubject();
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

        return new OrderUserPrincipal(userId, email, organizationId, roles);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}

