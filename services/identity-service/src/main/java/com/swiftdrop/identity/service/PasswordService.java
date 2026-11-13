package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.entity.AccountStatus;
import com.swiftdrop.identity.entity.PasswordResetToken;
import com.swiftdrop.identity.entity.User;
import com.swiftdrop.identity.event.IdentityEventPublisher;
import com.swiftdrop.identity.exception.AccountDisabledException;
import com.swiftdrop.identity.exception.InvalidCredentialsException;
import com.swiftdrop.identity.exception.InvalidTokenException;
import com.swiftdrop.identity.exception.ResourceNotFoundException;
import com.swiftdrop.identity.repository.PasswordResetTokenRepository;
import com.swiftdrop.identity.repository.RefreshTokenRepository;
import com.swiftdrop.identity.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Transactional
public class PasswordService {

    private static final Logger log = LoggerFactory.getLogger(PasswordService.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final IdentityEventPublisher eventPublisher;

    public PasswordService(UserRepository userRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           PasswordResetTokenRepository passwordResetTokenRepository,
                           PasswordEncoder passwordEncoder,
                           IdentityEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
    }

    public void changePassword(String email, ChangePasswordRequest request, HttpServletResponse response) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User with email " + email));

        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new AccountDisabledException();
        }

        // Validate current password (if user already has a password set)
        if (user.getPasswordHash() != null &&
                !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        // Reject reuse of the current password
        if (user.getPasswordHash() != null &&
                passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("New password cannot be the same as your current password");
        }

        // Hash new password and update
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);

        // Revoke all existing refresh tokens for security
        refreshTokenRepository.revokeAllByUser(user);

        log.info("Password changed successfully for user: {}", email);
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.getAccountStatus() != AccountStatus.ACTIVE) {
                log.warn("Forgot password requested for non-active user: {}", email);
                return;
            }

            // Invalidate previously issued reset tokens
            passwordResetTokenRepository.invalidateAllByUser(user);

            // Generate cryptographically secure token
            String rawToken = UUID.randomUUID().toString().replace("-", "")
                    + UUID.randomUUID().toString().replace("-", "");
            String tokenHash = AuthService.sha256Hex(rawToken);

            LocalDateTime expiresAt = LocalDateTime.now().plusHours(1);

            PasswordResetToken token = new PasswordResetToken();
            token.setUser(user);
            token.setTokenHash(tokenHash);
            token.setExpiresAt(expiresAt);
            token.setUsed(false);
            passwordResetTokenRepository.save(token);

            // Publish event for Notification Service
            eventPublisher.publishPasswordReset(user.getEmail(), rawToken, expiresAt);
            log.info("Issued password reset token for user: {}", email);
        });

        // Always return cleanly to avoid leaking account existence
    }

    public void resetPassword(ResetPasswordRequest request, HttpServletResponse response) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        String tokenHash = AuthService.sha256Hex(request.getToken());

        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidTokenException("Invalid or unknown password reset token"));

        if (token.isUsed()) {
            throw new InvalidTokenException("Password reset token has already been used");
        }

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException("Password reset token has expired");
        }

        // Invalidate token
        token.setUsed(true);
        passwordResetTokenRepository.save(token);

        User user = token.getUser();
        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new AccountDisabledException();
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);

        // Revoke all refresh tokens on password reset
        refreshTokenRepository.revokeAllByUser(user);

        log.info("Password reset successfully for user: {}", user.getEmail());
    }
}

