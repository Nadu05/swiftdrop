package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.AccountDetailsResponse;
import com.swiftdrop.identity.dto.UpdateProfileRequest;
import com.swiftdrop.identity.dto.UserProfileResponse;
import com.swiftdrop.identity.dto.VerifyEmailRequest;
import com.swiftdrop.identity.entity.*;
import com.swiftdrop.identity.event.IdentityEventPublisher;
import com.swiftdrop.identity.exception.DuplicateEmailException;
import com.swiftdrop.identity.exception.InvalidTokenException;
import com.swiftdrop.identity.repository.EmailVerificationTokenRepository;
import com.swiftdrop.identity.repository.RefreshTokenRepository;
import com.swiftdrop.identity.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private AuthService authService;

    @Mock
    private IdentityEventPublisher eventPublisher;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private Role customerRole;

    @BeforeEach
    void setUp() {
        customerRole = new Role(RoleName.CUSTOMER);
        customerRole.setRoleId(1L);

        testUser = new User();
        testUser.setUserId(UUID.randomUUID());
        testUser.setFullName("Jane Doe");
        testUser.setEmail("jane@example.com");
        testUser.setPhone("+1234567890");
        testUser.setAccountStatus(AccountStatus.ACTIVE);
        testUser.setAuthProvider(AuthProvider.LOCAL);
        testUser.setRoles(Set.of(customerRole));
        testUser.setEmailVerified(false);
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should retrieve user profile")
    void shouldRetrieveUserProfile() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));

        UserProfileResponse res = userService.getProfile("jane@example.com");

        assertThat(res).isNotNull();
        assertThat(res.getEmail()).isEqualTo("jane@example.com");
        assertThat(res.getFullName()).isEqualTo("Jane Doe");
        assertThat(res.getRoles()).contains("CUSTOMER");
    }

    @Test
    @DisplayName("Should update user profile")
    void shouldUpdateUserProfile() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        UpdateProfileRequest req = new UpdateProfileRequest("Jane Updated", "jane@example.com", "+1987654321");

        UserProfileResponse res = userService.updateProfile("jane@example.com", req);

        assertThat(res).isNotNull();
        assertThat(testUser.getFullName()).isEqualTo("Jane Updated");
        assertThat(testUser.getPhone()).isEqualTo("+1987654321");
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Should reject email update if already taken")
    void shouldRejectDuplicateEmailUpdate() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        UpdateProfileRequest req = new UpdateProfileRequest("Jane Updated", "taken@example.com", "+1987654321");

        assertThatThrownBy(() -> userService.updateProfile("jane@example.com", req))
                .isInstanceOf(DuplicateEmailException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should retrieve account details")
    void shouldRetrieveAccountDetails() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));

        AccountDetailsResponse res = userService.getAccountDetails("jane@example.com");

        assertThat(res).isNotNull();
        assertThat(res.getEmail()).isEqualTo("jane@example.com");
        assertThat(res.getAuthProvider()).isEqualTo("LOCAL");
        assertThat(res.getAccountStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Should deactivate account and revoke tokens")
    void shouldDeactivateAccount() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));

        userService.deactivateAccount("jane@example.com", request, response);

        assertThat(testUser.getAccountStatus()).isEqualTo(AccountStatus.DEACTIVATED);
        verify(userRepository).save(testUser);
        verify(refreshTokenRepository).revokeAllByUser(testUser);
        verify(authService).clearAuthCookies(response);
    }

    @Test
    @DisplayName("Should issue email verification token")
    void shouldSendEmailVerification() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(testUser));

        userService.sendEmailVerification("jane@example.com");

        verify(emailVerificationTokenRepository).invalidateAllByUser(testUser);
        verify(emailVerificationTokenRepository).save(any(EmailVerificationToken.class));
        verify(eventPublisher).publishEmailVerification(eq("jane@example.com"), anyString(), any());
    }

    @Test
    @DisplayName("Should verify email successfully with valid token")
    void shouldVerifyEmailSuccessfully() {
        String rawToken = "valid-verification-token";
        String tokenHash = AuthService.sha256Hex(rawToken);

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(testUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(LocalDateTime.now().plusHours(12));
        token.setUsed(false);

        when(emailVerificationTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

        VerifyEmailRequest req = new VerifyEmailRequest(rawToken);
        userService.verifyEmail(req);

        assertThat(token.isUsed()).isTrue();
        assertThat(testUser.isEmailVerified()).isTrue();
        assertThat(testUser.getEmailVerifiedAt()).isNotNull();
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Should reject verification token if already used")
    void shouldRejectUsedVerificationToken() {
        String rawToken = "already-used-token";
        String tokenHash = AuthService.sha256Hex(rawToken);

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(testUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(LocalDateTime.now().plusHours(12));
        token.setUsed(true);

        when(emailVerificationTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

        VerifyEmailRequest req = new VerifyEmailRequest(rawToken);

        assertThatThrownBy(() -> userService.verifyEmail(req))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("already been used");
    }

    @Test
    @DisplayName("Should reject verification token if expired")
    void shouldRejectExpiredVerificationToken() {
        String rawToken = "expired-token";
        String tokenHash = AuthService.sha256Hex(rawToken);

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(testUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(LocalDateTime.now().minusHours(1));
        token.setUsed(false);

        when(emailVerificationTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

        VerifyEmailRequest req = new VerifyEmailRequest(rawToken);

        assertThatThrownBy(() -> userService.verifyEmail(req))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("expired");
    }
}

