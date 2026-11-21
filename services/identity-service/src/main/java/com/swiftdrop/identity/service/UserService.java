package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.entity.*;
import com.swiftdrop.identity.event.IdentityEventPublisher;
import com.swiftdrop.identity.exception.*;
import com.swiftdrop.identity.repository.EmailVerificationTokenRepository;
import com.swiftdrop.identity.repository.RefreshTokenRepository;
import com.swiftdrop.identity.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final AuthService authService;
    private final IdentityEventPublisher eventPublisher;

    public UserService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       EmailVerificationTokenRepository emailVerificationTokenRepository,
                       AuthService authService,
                       IdentityEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.authService = authService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String email) {
        User user = findUserByEmail(email);
        return toUserProfileResponse(user);
    }

    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = findUserByEmail(email);

        user.setFullName(request.getFullName().trim());
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        // Email change handling if requested
        if (request.getEmail() != null) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.existsByEmail(newEmail)) {
                    throw new DuplicateEmailException(newEmail);
                }
                user.setEmail(newEmail);
                user.setEmailVerified(false);
                user.setEmailVerifiedAt(null);

                // Dispatch verification email to the new address
                sendEmailVerification(newEmail);
            }
        }

        user = userRepository.save(user);
        log.info("Profile updated for user: {}", user.getEmail());
        return toUserProfileResponse(user);
    }

    @Transactional(readOnly = true)
    public AccountDetailsResponse getAccountDetails(String email) {
        User user = findUserByEmail(email);

        List<String> roles = user.getRoles().stream()
                .map(r -> r.getRoleName().name())
                .sorted()
                .toList();

        return new AccountDetailsResponse(
                user.getUserId(),
                user.getEmail(),
                user.getAuthProvider().name(),
                user.getAccountStatus().name(),
                user.isEmailVerified(),
                user.getEmailVerifiedAt(),
                user.getPasswordChangedAt(),
                roles,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    public void deactivateAccount(String email, HttpServletRequest request, HttpServletResponse response) {
        User user = findUserByEmail(email);

        user.setAccountStatus(AccountStatus.DEACTIVATED);
        userRepository.save(user);

        // Security requirement: Revoke all active sessions and clear auth cookies
        refreshTokenRepository.revokeAllByUser(user);
        authService.clearAuthCookies(response);

        log.warn("Account deactivated for user: {}", email);
    }

    @Transactional(readOnly = true)
    public EmailVerificationStatusResponse getEmailVerificationStatus(String email) {
        User user = findUserByEmail(email);
        return new EmailVerificationStatusResponse(
                user.getEmail(),
                user.isEmailVerified(),
                user.getEmailVerifiedAt()
        );
    }

    public void sendEmailVerification(String email) {
        User user = findUserByEmail(email);

        if (user.isEmailVerified()) {
            log.info("User {} already verified their email; skipping token issuance", email);
            return;
        }

        // Invalidate old tokens
        emailVerificationTokenRepository.invalidateAllByUser(user);

        // Generate cryptographically random token
        String rawToken = UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        String tokenHash = AuthService.sha256Hex(rawToken);

        LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(expiresAt);
        token.setUsed(false);
        emailVerificationTokenRepository.save(token);

        // Publish event for Notification Service
        eventPublisher.publishEmailVerification(user.getEmail(), rawToken, expiresAt);
        log.info("Issued email verification token for user: {}", email);
    }

    public void verifyEmail(VerifyEmailRequest request) {
        String tokenHash = AuthService.sha256Hex(request.getToken());

        EmailVerificationToken token = emailVerificationTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidTokenException("Invalid or unknown verification token"));

        if (token.isUsed()) {
            throw new InvalidTokenException("Verification token has already been used");
        }

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException("Verification token has expired");
        }

        token.setUsed(true);
        emailVerificationTokenRepository.save(token);

        User user = token.getUser();
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Email verified successfully for user: {}", user.getEmail());
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User with email " + email));
    }

    private UserProfileResponse toUserProfileResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(r -> r.getRoleName().name())
                .sorted()
                .toList();

        return new UserProfileResponse(
                user.getUserId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                roles,
                user.getAccountStatus().name(),
                user.isEmailVerified(),
                user.getEmailVerifiedAt(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}

