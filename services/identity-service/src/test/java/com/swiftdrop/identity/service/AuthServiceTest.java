package com.swiftdrop.identity.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.swiftdrop.identity.dto.AuthResponse;
import com.swiftdrop.identity.dto.GoogleAuthRequest;
import com.swiftdrop.identity.dto.LoginRequest;
import com.swiftdrop.identity.dto.RegisterRequest;
import com.swiftdrop.identity.entity.*;
import com.swiftdrop.identity.exception.AccountDisabledException;
import com.swiftdrop.identity.exception.DuplicateEmailException;
import com.swiftdrop.identity.exception.InvalidCredentialsException;
import com.swiftdrop.identity.exception.InvalidTokenException;
import com.swiftdrop.identity.repository.RefreshTokenRepository;
import com.swiftdrop.identity.repository.RoleRepository;
import com.swiftdrop.identity.repository.UserRepository;
import com.swiftdrop.identity.security.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private AuthService authService;

    private Role customerRole;
    private User testUser;

    @BeforeEach
    void setUp() {
        customerRole = new Role(RoleName.CUSTOMER);
        customerRole.setRoleId(1L);

        testUser = new User();
        testUser.setUserId(UUID.randomUUID());
        testUser.setFullName("John Doe");
        testUser.setEmail("john.doe@example.com");
        testUser.setPasswordHash("$2a$10$hashedPasswordHere12345");
        testUser.setPhone("+1234567890");
        testUser.setAccountStatus(AccountStatus.ACTIVE);
        testUser.setAuthProvider(AuthProvider.LOCAL);
        testUser.setRoles(Set.of(customerRole));
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setUpdatedAt(LocalDateTime.now());

        ReflectionTestUtils.setField(authService, "googleClientId", "test-google-client-id");
        ReflectionTestUtils.setField(authService, "cookieSecure", false);
        ReflectionTestUtils.setField(authService, "cookieSameSite", "Lax");
    }

    // -----------------------------------------------------------------------
    // Registration Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Should successfully register a new customer with CUSTOMER role and hashed password")
    void shouldRegisterCustomerSuccessfully() {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("John Doe");
        req.setEmail("john.doe@example.com");
        req.setPhone("+1234567890");
        req.setPassword("Password123!");
        req.setConfirmPassword("Password123!");

        when(userRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(roleRepository.findByRoleName(RoleName.CUSTOMER)).thenReturn(Optional.of(customerRole));
        when(passwordEncoder.encode("Password123!")).thenReturn("$2a$10$encodedHash");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateAccessToken(any(UUID.class), any(UserDetails.class))).thenReturn("mock-access-token");
        when(jwtService.generateRawRefreshToken()).thenReturn("mock-raw-refresh-token");
        when(jwtService.getRefreshTokenExpiryMs()).thenReturn(604800000L);

        AuthResponse authResponse = authService.register(req, response);

        assertThat(authResponse).isNotNull();
        assertThat(authResponse.getEmail()).isEqualTo("john.doe@example.com");
        assertThat(authResponse.getRoles()).contains("CUSTOMER");
        assertThat(authResponse.getRoles()).doesNotContain("ADMIN", "MERCHANT", "DISPATCHER", "COURIER");

        // Verify password hashing was invoked with plain password
        verify(passwordEncoder).encode("Password123!");

        // Verify user saved with CUSTOMER role and not plain text password
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getPasswordHash()).isEqualTo("$2a$10$encodedHash");
        assertThat(savedUser.getRoles()).contains(customerRole);
        assertThat(savedUser.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);

        // Verify cookies were added via header
        verify(response, atLeastOnce()).addHeader(eq("Set-Cookie"), anyString());
    }

    @Test
    @DisplayName("Should reject registration with duplicate email")
    void shouldFailRegistrationWhenEmailAlreadyExists() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("john.doe@example.com");
        req.setPassword("Password123!");
        req.setConfirmPassword("Password123!");

        when(userRepository.existsByEmail("john.doe@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req, response))
                .isInstanceOf(DuplicateEmailException.class)
                .hasMessageContaining("john.doe@example.com");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject registration when passwords do not match")
    void shouldFailRegistrationWhenPasswordsMismatch() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("new@example.com");
        req.setPassword("Password123!");
        req.setConfirmPassword("Different123!");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

        assertThatThrownBy(() -> authService.register(req, response))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Passwords do not match");

        verify(userRepository, never()).save(any(User.class));
    }

    // -----------------------------------------------------------------------
    // Login Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Should successfully authenticate valid credentials")
    void shouldLoginSuccessfully() {
        LoginRequest req = new LoginRequest();
        req.setEmail("john.doe@example.com");
        req.setPassword("Password123!");

        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("Password123!", testUser.getPasswordHash())).thenReturn(true);
        when(jwtService.generateAccessToken(any(UUID.class), any(UserDetails.class))).thenReturn("access-token");
        when(jwtService.generateRawRefreshToken()).thenReturn("raw-refresh");
        when(jwtService.getRefreshTokenExpiryMs()).thenReturn(604800000L);

        AuthResponse res = authService.login(req, response);

        assertThat(res).isNotNull();
        assertThat(res.getEmail()).isEqualTo("john.doe@example.com");
        verify(refreshTokenRepository).revokeAllByUser(testUser);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
        verify(response, atLeastOnce()).addHeader(eq("Set-Cookie"), anyString());
    }

    @Test
    @DisplayName("Should reject login with incorrect password")
    void shouldFailLoginWithIncorrectPassword() {
        LoginRequest req = new LoginRequest();
        req.setEmail("john.doe@example.com");
        req.setPassword("WrongPassword");

        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPassword", testUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(req, response))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");

        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Should reject login when email does not exist")
    void shouldFailLoginWhenUserNotFound() {
        LoginRequest req = new LoginRequest();
        req.setEmail("nonexistent@example.com");
        req.setPassword("Password123!");

        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(req, response))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    @DisplayName("Should reject login when account is disabled")
    void shouldFailLoginWhenAccountDisabled() {
        testUser.setAccountStatus(AccountStatus.DISABLED);

        LoginRequest req = new LoginRequest();
        req.setEmail("john.doe@example.com");
        req.setPassword("Password123!");

        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("Password123!", testUser.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(req, response))
                .isInstanceOf(AccountDisabledException.class)
                .hasMessageContaining("not active");
    }

    // -----------------------------------------------------------------------
    // Google OAuth Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Should throw OAuthException when Google Client ID is not configured")
    void shouldThrowWhenGoogleClientIdNotConfigured() {
        ReflectionTestUtils.setField(authService, "googleClientId", "");

        GoogleAuthRequest req = new GoogleAuthRequest();
        req.setIdToken("mock-token");

        assertThatThrownBy(() -> authService.googleAuth(req, response))
                .isInstanceOf(com.swiftdrop.identity.exception.OAuthException.class)
                .hasMessageContaining("Google OAuth is not configured");
    }

    // -----------------------------------------------------------------------
    // Token Refresh Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Should successfully refresh token with valid unrevoked cookie")
    void shouldRefreshTokenSuccessfully() {
        Cookie refreshCookie = new Cookie("sd_refresh_token", "raw-secret-refresh-value");
        when(request.getCookies()).thenReturn(new Cookie[]{refreshCookie});

        String hash = AuthService.sha256Hex("raw-secret-refresh-value");
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(testUser);
        storedToken.setTokenHash(hash);
        storedToken.setExpiresAt(LocalDateTime.now().plusDays(5));
        storedToken.setRevoked(false);

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(storedToken));
        when(jwtService.generateAccessToken(any(UUID.class), any(UserDetails.class))).thenReturn("new-access");
        when(jwtService.generateRawRefreshToken()).thenReturn("new-refresh");
        when(jwtService.getRefreshTokenExpiryMs()).thenReturn(604800000L);

        AuthResponse res = authService.refresh(request, response);

        assertThat(res).isNotNull();
        assertThat(res.getEmail()).isEqualTo("john.doe@example.com");
        assertThat(storedToken.isRevoked()).isTrue(); // verified rotated
        verify(response, atLeastOnce()).addHeader(eq("Set-Cookie"), anyString());
    }

    @Test
    @DisplayName("Should reject refresh when refresh token is revoked")
    void shouldFailRefreshWhenTokenRevoked() {
        Cookie refreshCookie = new Cookie("sd_refresh_token", "revoked-token");
        when(request.getCookies()).thenReturn(new Cookie[]{refreshCookie});

        String hash = AuthService.sha256Hex("revoked-token");
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(testUser);
        storedToken.setTokenHash(hash);
        storedToken.setExpiresAt(LocalDateTime.now().plusDays(5));
        storedToken.setRevoked(true);

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(storedToken));

        assertThatThrownBy(() -> authService.refresh(request, response))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("revoked");
    }

    @Test
    @DisplayName("Should reject refresh when refresh token is expired")
    void shouldFailRefreshWhenTokenExpired() {
        Cookie refreshCookie = new Cookie("sd_refresh_token", "expired-token");
        when(request.getCookies()).thenReturn(new Cookie[]{refreshCookie});

        String hash = AuthService.sha256Hex("expired-token");
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(testUser);
        storedToken.setTokenHash(hash);
        storedToken.setExpiresAt(LocalDateTime.now().minusHours(1)); // Expired
        storedToken.setRevoked(false);

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(storedToken));

        assertThatThrownBy(() -> authService.refresh(request, response))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("expired");
    }

    // -----------------------------------------------------------------------
    // Logout Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Should revoke refresh token and clear cookies on logout")
    void shouldLogoutSuccessfully() {
        Cookie refreshCookie = new Cookie("sd_refresh_token", "logout-token");
        when(request.getCookies()).thenReturn(new Cookie[]{refreshCookie});

        String hash = AuthService.sha256Hex("logout-token");
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(testUser);
        storedToken.setTokenHash(hash);
        storedToken.setRevoked(false);

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(storedToken));

        authService.logout(request, response);

        assertThat(storedToken.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(storedToken);
        // Verify both access and refresh cookies cleared
        verify(response, times(2)).addCookie(any(Cookie.class));
    }

    // -----------------------------------------------------------------------
    // Get Current User Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Should get current user profile")
    void shouldGetCurrentUserProfile() {
        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.of(testUser));

        AuthResponse res = authService.getCurrentUser("john.doe@example.com");

        assertThat(res).isNotNull();
        assertThat(res.getEmail()).isEqualTo("john.doe@example.com");
        assertThat(res.getFullName()).isEqualTo("John Doe");
        assertThat(res.getRoles()).contains("CUSTOMER");
        assertThat(res.getAccountStatus()).isEqualTo("ACTIVE");
    }
}

