package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.ChangePasswordRequest;
import com.swiftdrop.identity.dto.ForgotPasswordRequest;
import com.swiftdrop.identity.dto.ResetPasswordRequest;
import com.swiftdrop.identity.entity.AccountStatus;
import com.swiftdrop.identity.entity.PasswordResetToken;
import com.swiftdrop.identity.entity.User;
import com.swiftdrop.identity.event.IdentityEventPublisher;
import com.swiftdrop.identity.exception.InvalidCredentialsException;
import com.swiftdrop.identity.exception.InvalidTokenException;
import com.swiftdrop.identity.repository.PasswordResetTokenRepository;
import com.swiftdrop.identity.repository.RefreshTokenRepository;
import com.swiftdrop.identity.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private IdentityEventPublisher eventPublisher;

    @Mock
    private AuthService authService;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private PasswordService passwordService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(UUID.randomUUID());
        testUser.setEmail("jane@example.com");
        testUser.setPasswordHash("$2a$10$hashedCurrentPassword123");
        testUser.setAccountStatus(AccountStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should change password successfully and clear mustChangePassword and temporaryPassword")
    void shouldChangePasswordSuccessfully() {
        testUser.setMustChangePassword(true);
        testUser.setTemporaryPassword("OldPass123!");

        ChangePasswordRequest req =
                new ChangePasswordRequest("OldPass123!", "NewPass123!", "NewPass123!");

        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("OldPass123!", testUser.getPasswordHash())).thenReturn(true);
        when(passwordEncoder.matches("NewPass123!", testUser.getPasswordHash())).thenReturn(false);
        when(passwordEncoder.encode("NewPass123!")).thenReturn("$2a$10$newHashedPassword123");

        passwordService.changePassword("jane@example.com", req, response);

        assertThat(testUser.getPasswordHash()).isEqualTo("$2a$10$newHashedPassword123");
        assertThat(testUser.getPasswordChangedAt()).isNotNull();
        assertThat(testUser.isMustChangePassword()).isFalse();
        assertThat(testUser.getTemporaryPassword()).isNull();
        verify(refreshTokenRepository).revokeAllByUser(testUser);
        verify(authService).issueTokens(eq(testUser), eq(response));
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Should reject password change when passwords do not match")
    void shouldRejectChangePasswordMismatch() {
        ChangePasswordRequest req =
                new ChangePasswordRequest("OldPass123!", "NewPass123!", "DifferentPass123!");

        assertThatThrownBy(() -> passwordService.changePassword("jane@example.com", req, response))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Passwords do not match");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject password change when current password is wrong")
    void shouldRejectChangePasswordWrongCurrent() {
        ChangePasswordRequest req =
                new ChangePasswordRequest("WrongPass123!", "NewPass123!", "NewPass123!");

        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPass123!", testUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> passwordService.changePassword("jane@example.com", req, response))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject password change when new password equals current password")
    void shouldRejectChangePasswordReuseCurrent() {
        ChangePasswordRequest req =
                new ChangePasswordRequest("CurrentPass123!", "CurrentPass123!", "CurrentPass123!");

        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("CurrentPass123!", testUser.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> passwordService.changePassword("jane@example.com", req, response))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be the same");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should issue reset token and publish event on forgot password")
    void shouldHandleForgotPassword() {
        ForgotPasswordRequest req = new ForgotPasswordRequest("jane@example.com");

        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));

        passwordService.forgotPassword(req);

        verify(passwordResetTokenRepository).invalidateAllByUser(testUser);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        verify(eventPublisher).publishPasswordReset(eq("jane@example.com"), anyString(), any());
    }

    @Test
    @DisplayName("Should silently handle forgot password for non-existent user")
    void shouldHandleForgotPasswordNonExistentUser() {
        ForgotPasswordRequest req = new ForgotPasswordRequest("nonexistent@example.com");

        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        passwordService.forgotPassword(req);

        verify(passwordResetTokenRepository, never()).save(any());
        verify(eventPublisher, never()).publishPasswordReset(any(), any(), any());
    }

    @Test
    @DisplayName("Should reset password with valid token")
    void shouldResetPasswordSuccessfully() {
        String rawToken = "valid-reset-token";
        String tokenHash = AuthService.sha256Hex(rawToken);

        PasswordResetToken token = new PasswordResetToken();
        token.setUser(testUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(45));
        token.setUsed(false);

        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("NewPass123!")).thenReturn("$2a$10$resetHashedPassword");

        ResetPasswordRequest req = new ResetPasswordRequest(rawToken, "NewPass123!", "NewPass123!");
        passwordService.resetPassword(req, response);

        assertThat(token.isUsed()).isTrue();
        assertThat(testUser.getPasswordHash()).isEqualTo("$2a$10$resetHashedPassword");
        assertThat(testUser.getPasswordChangedAt()).isNotNull();
        verify(refreshTokenRepository).revokeAllByUser(testUser);
        verify(authService).clearAuthCookies(eq(response));
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Should reject password reset when token is expired")
    void shouldRejectResetPasswordExpiredToken() {
        String rawToken = "expired-token";
        String tokenHash = AuthService.sha256Hex(rawToken);

        PasswordResetToken token = new PasswordResetToken();
        token.setUser(testUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(LocalDateTime.now().minusMinutes(5));
        token.setUsed(false);

        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

        ResetPasswordRequest req = new ResetPasswordRequest(rawToken, "NewPass123!", "NewPass123!");

        assertThatThrownBy(() -> passwordService.resetPassword(req, response))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("expired");
    }

    @Test
    @DisplayName("Should reject password reset when passwords do not match")
    void shouldRejectResetPasswordMismatch() {
        ResetPasswordRequest req = new ResetPasswordRequest("valid-token", "NewPass123!", "MismatchPass123!");

        assertThatThrownBy(() -> passwordService.resetPassword(req, response))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Passwords do not match");

        verify(passwordResetTokenRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject password reset when token is unknown")
    void shouldRejectResetPasswordUnknownToken() {
        String rawToken = "unknown-token";
        String tokenHash = AuthService.sha256Hex(rawToken);

        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.empty());

        ResetPasswordRequest req = new ResetPasswordRequest(rawToken, "NewPass123!", "NewPass123!");

        assertThatThrownBy(() -> passwordService.resetPassword(req, response))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("Invalid or unknown");
    }

    @Test
    @DisplayName("Should reject password reset when token was already used")
    void shouldRejectResetPasswordUsedToken() {
        String rawToken = "used-token";
        String tokenHash = AuthService.sha256Hex(rawToken);

        PasswordResetToken token = new PasswordResetToken();
        token.setUser(testUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(45));
        token.setUsed(true);

        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

        ResetPasswordRequest req = new ResetPasswordRequest(rawToken, "NewPass123!", "NewPass123!");

        assertThatThrownBy(() -> passwordService.resetPassword(req, response))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("already been used");
    }
}

