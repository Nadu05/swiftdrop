package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.entity.*;
import com.swiftdrop.identity.exception.DuplicateEmailException;
import com.swiftdrop.identity.exception.ResourceNotFoundException;
import com.swiftdrop.identity.repository.RefreshTokenRepository;
import com.swiftdrop.identity.repository.RoleRepository;
import com.swiftdrop.identity.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminService adminService;

    private User sampleUser;
    private Role customerRole;
    private Role adminRole;
    private UUID sampleUserId;

    @BeforeEach
    void setUp() {
        sampleUserId = UUID.randomUUID();
        customerRole = new Role(RoleName.CUSTOMER);
        customerRole.setRoleId(1L);

        adminRole = new Role(RoleName.ADMIN);
        adminRole.setRoleId(5L);

        sampleUser = new User();
        sampleUser.setUserId(sampleUserId);
        sampleUser.setFullName("John Doe");
        sampleUser.setEmail("john@example.com");
        sampleUser.setPasswordHash("hashed-password");
        sampleUser.setPhone("+1234567890");
        sampleUser.setAccountStatus(AccountStatus.ACTIVE);
        sampleUser.setAuthProvider(AuthProvider.LOCAL);
        sampleUser.setRoles(new HashSet<>(Set.of(customerRole)));
        sampleUser.setCreatedAt(LocalDateTime.now());
        sampleUser.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("listUsers - Returns paginated user responses")
    void listUsersSuccess() {
        Page<User> page = new PageImpl<>(List.of(sampleUser), PageRequest.of(0, 10), 1);
        when(userRepository.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(page);

        PageResponse<AdminUserResponse> result = adminService.listUsers(
                "John", RoleName.CUSTOMER, AccountStatus.ACTIVE, PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmail()).isEqualTo("john@example.com");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getUserById - Success")
    void getUserByIdSuccess() {
        when(userRepository.findById(sampleUserId)).thenReturn(Optional.of(sampleUser));

        AdminUserResponse response = adminService.getUserById(sampleUserId);

        assertThat(response.getUserId()).isEqualTo(sampleUserId);
        assertThat(response.getFullName()).isEqualTo("John Doe");
    }

    @Test
    @DisplayName("getUserById - User not found throws ResourceNotFoundException")
    void getUserByIdNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.getUserById(unknownId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    @DisplayName("createUser - Success with roles")
    void createUserSuccess() {
        AdminCreateUserRequest req = new AdminCreateUserRequest(
                "New Admin", "admin@swiftdrop.io", "AdminPass123!", "+1987654321",
                List.of("ADMIN"), "ACTIVE", true
        );

        when(userRepository.existsByEmail("admin@swiftdrop.io")).thenReturn(false);
        when(passwordEncoder.encode("AdminPass123!")).thenReturn("bcrypt-admin-hash");
        when(roleRepository.findByRoleName(RoleName.ADMIN)).thenReturn(Optional.of(adminRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setUserId(UUID.randomUUID());
            return u;
        });

        AdminUserResponse res = adminService.createUser(req);

        assertThat(res.getEmail()).isEqualTo("admin@swiftdrop.io");
        assertThat(res.getRoles()).contains("ADMIN");
        assertThat(res.isEmailVerified()).isTrue();
    }

    @Test
    @DisplayName("createUser - Duplicate email throws DuplicateEmailException")
    void createUserDuplicateEmail() {
        AdminCreateUserRequest req = new AdminCreateUserRequest(
                "Duplicate", "john@example.com", "Password123!", null, null, null, null
        );

        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        assertThatThrownBy(() -> adminService.createUser(req))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    @DisplayName("suspendUser - Revokes tokens and updates status")
    void suspendUserSuccess() {
        when(userRepository.findById(sampleUserId)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminUserResponse res = adminService.suspendUser(sampleUserId, "superadmin@swiftdrop.io");

        assertThat(res.getAccountStatus()).isEqualTo("SUSPENDED");
        verify(refreshTokenRepository).revokeAllByUser(sampleUser);
    }

    @Test
    @DisplayName("suspendUser - Last active admin cannot be suspended")
    void suspendUserLastAdminProtected() {
        sampleUser.setRoles(new HashSet<>(Set.of(adminRole)));
        when(userRepository.findById(sampleUserId)).thenReturn(Optional.of(sampleUser));
        when(userRepository.countByRoleNameAndAccountStatus(RoleName.ADMIN, AccountStatus.ACTIVE)).thenReturn(1L);

        assertThatThrownBy(() -> adminService.suspendUser(sampleUserId, "admin@swiftdrop.io"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot suspend or deactivate the last active system administrator");

        verify(refreshTokenRepository, never()).revokeAllByUser(any());
    }

    @Test
    @DisplayName("activateUser - Updates status to ACTIVE")
    void activateUserSuccess() {
        sampleUser.setAccountStatus(AccountStatus.SUSPENDED);
        when(userRepository.findById(sampleUserId)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminUserResponse res = adminService.activateUser(sampleUserId, "admin@swiftdrop.io");

        assertThat(res.getAccountStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("assignRole - Adds role to user")
    void assignRoleSuccess() {
        when(userRepository.findById(sampleUserId)).thenReturn(Optional.of(sampleUser));
        when(roleRepository.findByRoleName(RoleName.DISPATCHER)).thenReturn(Optional.of(new Role(RoleName.DISPATCHER)));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminUserResponse res = adminService.assignRole(sampleUserId, RoleName.DISPATCHER, "admin@swiftdrop.io");

        assertThat(res.getRoles()).contains("DISPATCHER", "CUSTOMER");
    }

    @Test
    @DisplayName("removeRole - Last active admin role cannot be removed")
    void removeRoleLastAdminProtected() {
        sampleUser.setRoles(new HashSet<>(Set.of(adminRole)));
        when(userRepository.findById(sampleUserId)).thenReturn(Optional.of(sampleUser));
        when(roleRepository.findById(5L)).thenReturn(Optional.of(adminRole));
        when(userRepository.countByRoleNameAndAccountStatus(RoleName.ADMIN, AccountStatus.ACTIVE)).thenReturn(1L);

        assertThatThrownBy(() -> adminService.removeRole(sampleUserId, 5L, "admin@swiftdrop.io"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot remove ADMIN role from the last active system administrator");
    }

    @Test
    @DisplayName("getDashboardStats - Returns aggregated identity metrics")
    void getDashboardStatsSuccess() {
        when(userRepository.count()).thenReturn(50L);
        when(userRepository.countByAccountStatus(AccountStatus.ACTIVE)).thenReturn(45L);
        when(userRepository.countByAccountStatus(AccountStatus.SUSPENDED)).thenReturn(3L);
        when(userRepository.countByAccountStatus(AccountStatus.DEACTIVATED)).thenReturn(2L);
        when(userRepository.countByAccountStatus(AccountStatus.PENDING_VERIFICATION)).thenReturn(0L);
        when(userRepository.countByRoleName(any(RoleName.class))).thenReturn(10L);

        AdminDashboardStatsResponse stats = adminService.getDashboardStats();

        assertThat(stats.getTotalUsers()).isEqualTo(50L);
        assertThat(stats.getActiveUsers()).isEqualTo(45L);
        assertThat(stats.getSuspendedUsers()).isEqualTo(3L);
        assertThat(stats.getUsersByRole()).containsKey("ADMIN");
    }
}

