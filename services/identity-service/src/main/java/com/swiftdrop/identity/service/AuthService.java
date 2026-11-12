package com.swiftdrop.identity.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.entity.*;
import com.swiftdrop.identity.exception.*;
import com.swiftdrop.identity.repository.*;
import com.swiftdrop.identity.security.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;

/**
 * Core authentication service.
 * All business logic lives here; the controller remains a thin HTTP adapter.
 */
@Service
@Transactional
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    static final String ACCESS_COOKIE_NAME  = "sd_access_token";
    static final String REFRESH_COOKIE_NAME = "sd_refresh_token";

    private final UserRepository         userRepository;
    private final RoleRepository         roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder        passwordEncoder;
    private final JwtService             jwtService;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository         = userRepository;
        this.roleRepository         = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder        = passwordEncoder;
        this.jwtService             = jwtService;
    }

    // -----------------------------------------------------------------------
    // Registration
    // -----------------------------------------------------------------------

    /**
     * Registers a new customer account.
     * Role is hard-coded to CUSTOMER — callers cannot influence this.
     */
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        // 1. Normalize and validate email uniqueness
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException(email);
        }

        // 2. Validate passwords match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // 3. Resolve the CUSTOMER role (always seeded by Flyway)
        Role customerRole = roleRepository.findByRoleName(RoleName.CUSTOMER)
                .orElseThrow(() -> new IllegalStateException("CUSTOMER role not found — check V3 migration"));

        // 4. Build and persist the user
        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone().trim());
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.getRoles().add(customerRole);

        user = userRepository.save(user);
        log.info("Registered new customer account: {}", email);

        // 5. Issue tokens and set cookies
        issueTokens(user, response);

        return toAuthResponse(user);
    }

    // -----------------------------------------------------------------------
    // Login
    // -----------------------------------------------------------------------

    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        // Verify password (generic error regardless of which check fails)
        if (user.getPasswordHash() == null ||
                !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        // Verify account status
        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new AccountDisabledException();
        }

        // Rotate refresh tokens: revoke old ones, issue new ones
        refreshTokenRepository.revokeAllByUser(user);
        refreshTokenRepository.deleteAllExpiredBefore(LocalDateTime.now());

        issueTokens(user, response);
        log.info("Successful login: {}", email);

        return toAuthResponse(user);
    }

    // -----------------------------------------------------------------------
    // Google OAuth
    // -----------------------------------------------------------------------

    public AuthResponse googleAuth(GoogleAuthRequest request, HttpServletResponse response) {
        GoogleIdToken.Payload payload = verifyGoogleToken(request.getIdToken());

        String googleSub = payload.getSubject();
        String email     = payload.getEmail().trim().toLowerCase();
        String name      = (String) payload.get("name");

        // Try to find by provider ID first, then by email
        User user = userRepository
                .findByAuthProviderAndProviderUserId(AuthProvider.GOOGLE, googleSub)
                .orElseGet(() -> userRepository.findByEmail(email).orElse(null));

        if (user == null) {
            // New user — create account
            Role customerRole = roleRepository.findByRoleName(RoleName.CUSTOMER)
                    .orElseThrow(() -> new IllegalStateException("CUSTOMER role not found"));

            user = new User();
            user.setFullName(name != null ? name : email);
            user.setEmail(email);
            user.setPasswordHash(null); // OAuth account — no local password
            user.setAccountStatus(AccountStatus.ACTIVE);
            user.setAuthProvider(AuthProvider.GOOGLE);
            user.setProviderUserId(googleSub);
            user.getRoles().add(customerRole);

            user = userRepository.save(user);
            log.info("Created new Google-authenticated account: {}", email);
        } else {
            // Existing user
            if (user.getAccountStatus() != AccountStatus.ACTIVE) {
                throw new AccountDisabledException();
            }
            // Link Google if not already linked
            if (user.getProviderUserId() == null) {
                user.setProviderUserId(googleSub);
                user.setAuthProvider(AuthProvider.GOOGLE);
                user = userRepository.save(user);
            }
            log.info("Google login for existing account: {}", email);
        }

        refreshTokenRepository.revokeAllByUser(user);
        issueTokens(user, response);

        return toAuthResponse(user);
    }

    // -----------------------------------------------------------------------
    // Refresh
    // -----------------------------------------------------------------------

    public AuthResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawToken = extractRefreshCookie(request)
                .orElseThrow(() -> new InvalidTokenException("No refresh token present"));

        String hash = sha256Hex(rawToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new InvalidTokenException("Invalid or unknown refresh token"));

        if (stored.isRevoked()) {
            throw new InvalidTokenException("Refresh token has been revoked");
        }
        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            stored.setRevoked(true);
            refreshTokenRepository.save(stored);
            throw new InvalidTokenException("Refresh token has expired");
        }

        // Rotate: revoke old, issue new
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        User user = stored.getUser();
        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new AccountDisabledException();
        }

        issueTokens(user, response);
        return toAuthResponse(user);
    }

    // -----------------------------------------------------------------------
    // Get current user
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", -1L));
        return toAuthResponse(user);
    }

    // -----------------------------------------------------------------------
    // Logout
    // -----------------------------------------------------------------------

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        extractRefreshCookie(request).ifPresent(rawToken -> {
            String hash = sha256Hex(rawToken);
            refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        });

        clearCookie(response, ACCESS_COOKIE_NAME);
        clearCookie(response, REFRESH_COOKIE_NAME);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private void issueTokens(User user, HttpServletResponse response) {
        UserDetails details = buildUserDetails(user);

        // Access token
        String accessToken = jwtService.generateAccessToken(user.getUserId(), details);
        addCookie(response, ACCESS_COOKIE_NAME, accessToken,
                (int) (jwtService.getRefreshTokenExpiryMs() / 1000)); // same max-age as refresh for cookie lifecycle

        // Refresh token
        String rawRefresh = jwtService.generateRawRefreshToken();
        persistRefreshToken(user, rawRefresh);
        addCookie(response, REFRESH_COOKIE_NAME, rawRefresh,
                (int) (jwtService.getRefreshTokenExpiryMs() / 1000));
    }

    private void persistRefreshToken(User user, String rawToken) {
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(sha256Hex(rawToken));
        token.setExpiresAt(LocalDateTime.now().plusSeconds(
                jwtService.getRefreshTokenExpiryMs() / 1000));
        refreshTokenRepository.save(token);
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAgeSeconds) {
        // Build Set-Cookie header manually to support SameSite attribute
        String cookie = name + "=" + value
                + "; Path=/"
                + "; HttpOnly"
                + "; Max-Age=" + maxAgeSeconds
                + "; SameSite=" + cookieSameSite
                + (cookieSecure ? "; Secure" : "");
        response.addHeader("Set-Cookie", cookie);
    }

    private void clearCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setMaxAge(0);
        cookie.setPath("/");
        response.addCookie(cookie);
    }

    private java.util.Optional<String> extractRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return java.util.Optional.empty();
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }

    private UserDetails buildUserDetails(User user) {
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getRoleName().name()))
                .toList();

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash() != null ? user.getPasswordHash() : "",
                authorities
        );
    }

    private AuthResponse toAuthResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(r -> r.getRoleName().name())
                .sorted()
                .toList();

        return new AuthResponse(
                user.getUserId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                roles,
                user.getAccountStatus().name(),
                user.getCreatedAt()
        );
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idTokenString) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new OAuthException("Google OAuth is not configured on this server");
        }
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new OAuthException("Invalid Google ID token");
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            Boolean emailVerified = payload.getEmailVerified();
            if (emailVerified != null && !emailVerified) {
                throw new OAuthException("Google email address is not verified");
            }
            return payload;
        } catch (GeneralSecurityException | IOException ex) {
            log.warn("Google token verification failed: {}", ex.getMessage());
            throw new OAuthException("Google authentication failed");
        }
    }

    static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }
}

