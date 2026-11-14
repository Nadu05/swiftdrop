package com.swiftdrop.notification.security;

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
public class NotificationJwtService {

    private final SecretKey signingKey;

    public NotificationJwtService(
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

    public NotificationUserPrincipal parsePrincipal(String token) {
        Claims claims = parseClaims(token);
        String userId = claims.getSubject();
        String email = claims.get("email", String.class);

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

        Long branchId = null;
        Object rawBranchId = claims.get("branchId");
        if (rawBranchId instanceof Number num) {
            branchId = num.longValue();
        } else if (rawBranchId instanceof String str && !str.isBlank()) {
            try {
                branchId = Long.parseLong(str.trim());
            } catch (NumberFormatException ignored) {
            }
        }

        return new NotificationUserPrincipal(userId, email, roles, branchId);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer("swiftdrop-identity-service")
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
