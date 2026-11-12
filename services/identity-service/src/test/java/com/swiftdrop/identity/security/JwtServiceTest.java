package com.swiftdrop.identity.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;
    private final String secret = Base64.getEncoder().encodeToString(
            "very-long-secret-key-for-testing-hmac-sha-256-swiftdrop-auth-platform-2026".getBytes()
    );

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiryMs", 900000L); // 15 mins
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiryMs", 604800000L); // 7 days
    }

    @Test
    @DisplayName("Should generate valid JWT access token and extract claims")
    void shouldGenerateAndExtractClaims() {
        UUID userId = UUID.randomUUID();
        UserDetails details = new User(
                "customer@swiftdrop.com",
                "password",
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        );

        String token = jwtService.generateAccessToken(userId, details);

        assertThat(token).isNotBlank();
        assertThat(jwtService.isValid(token)).isTrue();
        assertThat(jwtService.extractUserId(token)).isEqualTo(userId.toString());
        assertThat(jwtService.extractEmail(token)).isEqualTo("customer@swiftdrop.com");
        assertThat(jwtService.extractRoles(token)).containsExactly("ROLE_CUSTOMER");
    }

    @Test
    @DisplayName("Should reject tampered or malformed token")
    void shouldRejectTamperedToken() {
        UUID userId = UUID.randomUUID();
        UserDetails details = new User(
                "test@swiftdrop.com",
                "password",
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        );

        String token = jwtService.generateAccessToken(userId, details);
        String tampered = token + "xyz";

        assertThat(jwtService.isValid(tampered)).isFalse();
        assertThat(jwtService.isValid("invalid-garbage-token")).isFalse();
        assertThat(jwtService.isValid("")).isFalse();
    }

    @Test
    @DisplayName("Should reject expired token")
    void shouldRejectExpiredToken() {
        // Set expiry to -1000ms so it's already expired
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiryMs", -1000L);

        UUID userId = UUID.randomUUID();
        UserDetails details = new User(
                "expired@swiftdrop.com",
                "password",
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        );

        String expiredToken = jwtService.generateAccessToken(userId, details);

        assertThat(jwtService.isValid(expiredToken)).isFalse();
    }

    @Test
    @DisplayName("Should generate opaque random refresh token")
    void shouldGenerateRawRefreshToken() {
        String token1 = jwtService.generateRawRefreshToken();
        String token2 = jwtService.generateRawRefreshToken();

        assertThat(token1).isNotBlank();
        assertThat(token2).isNotBlank();
        assertThat(token1).isNotEqualTo(token2);
    }
}

