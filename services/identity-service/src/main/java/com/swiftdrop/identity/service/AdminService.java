package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.entity.*;
import com.swiftdrop.identity.exception.BranchManagerAlreadyExistsException;
import com.swiftdrop.identity.exception.DuplicateEmailException;
import com.swiftdrop.identity.exception.ResourceNotFoundException;
import com.swiftdrop.identity.repository.RefreshTokenRepository;
import com.swiftdrop.identity.repository.RoleRepository;
import com.swiftdrop.identity.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "!@#$%^&*-_=+";
    private static final String ALL_PASSWORD_CHARS = UPPER + LOWER + DIGITS + SPECIAL;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(UserRepository userRepository,
                        RoleRepository roleRepository,
                        RefreshTokenRepository refreshTokenRepository,
                        PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // -----------------------------------------------------------------------
    // User Administration
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> listUsers(String search,
                                                     RoleName role,
                                                     AccountStatus status,
                                                     Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("fullName")), pattern);
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), pattern);
                Predicate phoneMatch = cb.like(cb.lower(root.get("phone")), pattern);
                predicates.add(cb.or(nameMatch, emailMatch, phoneMatch));
            }

            if (role != null) {
                Join<User, Role> roleJoin = root.join("roles");
                predicates.add(cb.equal(roleJoin.get("roleName"), role));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("accountStatus"), status));
            }

            if (query != null) {
                query.distinct(true);
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> page = userRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::toAdminUserResponse));
    }

    @Transactional(readOnly = true)
    public AdminUserResponse getUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return toAdminUserResponse(user);
    }

    public AdminUserResponse createUser(AdminCreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase().trim())) {
            throw new DuplicateEmailException(request.getEmail());
        }

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().toLowerCase().trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        user.setAuthProvider(AuthProvider.LOCAL);

        // Account status
        if (request.getAccountStatus() != null && !request.getAccountStatus().isBlank()) {
            user.setAccountStatus(AccountStatus.valueOf(request.getAccountStatus().toUpperCase()));
        } else {
            user.setAccountStatus(AccountStatus.ACTIVE);
        }

        // Email verified
        if (Boolean.TRUE.equals(request.getEmailVerified())) {
            user.setEmailVerified(true);
            user.setEmailVerifiedAt(LocalDateTime.now());
        } else {
            user.setEmailVerified(false);
        }

        // Roles
        Set<Role> roles = resolveRoles(request.getRoles());
        user.setRoles(roles);
        user.setBranchId(request.getBranchId());
        user.setOrganizationId(request.getOrganizationId() != null && !request.getOrganizationId().isBlank()
                ? request.getOrganizationId().trim()
                : null);

        User saved = userRepository.save(user);
        log.info("Admin created new user '{}' with roles {}", saved.getEmail(), request.getRoles());
        return toAdminUserResponse(saved);
    }

    public AdminUserResponse updateUser(UUID userId, AdminUpdateUserRequest request, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        if (request.getEmailVerified() != null) {
            user.setEmailVerified(request.getEmailVerified());
            if (request.getEmailVerified() && user.getEmailVerifiedAt() == null) {
                user.setEmailVerifiedAt(LocalDateTime.now());
            }
        }

        if (request.getBranchId() != null) {
            user.setBranchId(request.getBranchId());
        }

        if (request.getOrganizationId() != null) {
            user.setOrganizationId(request.getOrganizationId().isBlank() ? null : request.getOrganizationId().trim());
        }

        // Roles update
        if (request.getRoles() != null) {
            Set<Role> newRoles = resolveRoles(request.getRoles());
            boolean hadAdmin = user.hasRole(RoleName.ADMIN);
            boolean willHaveAdmin = newRoles.stream().anyMatch(r -> r.getRoleName() == RoleName.ADMIN);

            if (hadAdmin && !willHaveAdmin && isLastActiveAdmin(user)) {
                throw new IllegalArgumentException("Cannot remove ADMIN role from the last active system administrator");
            }
            user.setRoles(newRoles);
        }

        // Account status update
        if (request.getAccountStatus() != null && !request.getAccountStatus().isBlank()) {
            AccountStatus newStatus = AccountStatus.valueOf(request.getAccountStatus().toUpperCase());
            if ((newStatus == AccountStatus.SUSPENDED || newStatus == AccountStatus.DEACTIVATED)
                    && isLastActiveAdmin(user)) {
                throw new IllegalArgumentException("Cannot suspend or deactivate the last active system administrator");
            }
            if (newStatus != user.getAccountStatus()) {
                user.setAccountStatus(newStatus);
                if (newStatus == AccountStatus.SUSPENDED || newStatus == AccountStatus.DEACTIVATED) {
                    refreshTokenRepository.revokeAllByUser(user);
                }
            }
        }

        User updated = userRepository.save(user);
        log.info("Admin '{}' updated user '{}'", adminEmail, updated.getEmail());
        return toAdminUserResponse(updated);
    }

    public AdminUserResponse updateAccountStatus(UUID userId, AccountStatus newStatus, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if ((newStatus == AccountStatus.SUSPENDED || newStatus == AccountStatus.DEACTIVATED)
                && isLastActiveAdmin(user)) {
            throw new IllegalArgumentException("Cannot suspend or deactivate the last active system administrator");
        }

        user.setAccountStatus(newStatus);
        if (newStatus == AccountStatus.SUSPENDED || newStatus == AccountStatus.DEACTIVATED) {
            refreshTokenRepository.revokeAllByUser(user);
            log.warn("Revoked all refresh tokens for suspended/deactivated user '{}'", user.getEmail());
        }

        User updated = userRepository.save(user);
        log.info("Admin '{}' set status of user '{}' to {}", adminEmail, updated.getEmail(), newStatus);
        return toAdminUserResponse(updated);
    }

    public AdminUserResponse activateUser(UUID userId, String adminEmail) {
        return updateAccountStatus(userId, AccountStatus.ACTIVE, adminEmail);
    }

    public AdminUserResponse suspendUser(UUID userId, String adminEmail) {
        return updateAccountStatus(userId, AccountStatus.SUSPENDED, adminEmail);
    }

    // -----------------------------------------------------------------------
    // Role Management
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<RoleResponse> listRoles() {
        List<Role> roles = roleRepository.findAllByOrderByRoleIdAsc();
        return roles.stream().map(role -> {
            long count = userRepository.countByRoleName(role.getRoleName());
            return new RoleResponse(role.getRoleId(), role.getRoleName().name(), role.getDescription(), count);
        }).toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse getRoleById(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));
        long count = userRepository.countByRoleName(role.getRoleName());
        return new RoleResponse(role.getRoleId(), role.getRoleName().name(), role.getDescription(), count);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> getUsersByRoleId(Long roleId, Pageable pageable) {
        if (!roleRepository.existsById(roleId)) {
            throw new ResourceNotFoundException("Role not found: " + roleId);
        }
        Page<User> page = userRepository.findByRoleId(roleId, pageable);
        return PageResponse.from(page.map(this::toAdminUserResponse));
    }

    public AdminUserResponse assignRole(UUID userId, RoleName roleName, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        if (user.hasRole(roleName)) {
            return toAdminUserResponse(user); // Idempotent
        }

        user.addRole(role);
        User saved = userRepository.save(user);
        log.info("Admin '{}' assigned role '{}' to user '{}'", adminEmail, roleName, user.getEmail());
        return toAdminUserResponse(saved);
    }

    public AdminUserResponse removeRole(UUID userId, Long roleId, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));

        if (role.getRoleName() == RoleName.ADMIN && isLastActiveAdmin(user)) {
            throw new IllegalArgumentException("Cannot remove ADMIN role from the last active system administrator");
        }

        user.removeRole(role);
        User saved = userRepository.save(user);
        log.info("Admin '{}' removed role '{}' from user '{}'", adminEmail, role.getRoleName(), user.getEmail());
        return toAdminUserResponse(saved);
    }

    // -----------------------------------------------------------------------
    // Admin Dashboard Stats
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public AdminDashboardStatsResponse getDashboardStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByAccountStatus(AccountStatus.ACTIVE);
        long suspendedUsers = userRepository.countByAccountStatus(AccountStatus.SUSPENDED);
        long deactivatedUsers = userRepository.countByAccountStatus(AccountStatus.DEACTIVATED);
        long pendingVerificationUsers = userRepository.countByAccountStatus(AccountStatus.PENDING_VERIFICATION);

        Map<String, Long> usersByRole = new LinkedHashMap<>();
        for (RoleName roleName : RoleName.values()) {
            usersByRole.put(roleName.name(), userRepository.countByRoleName(roleName));
        }

        return new AdminDashboardStatsResponse(
                totalUsers,
                activeUsers,
                suspendedUsers,
                deactivatedUsers,
                pendingVerificationUsers,
                usersByRole
        );
    }

    // -----------------------------------------------------------------------
    // Branch Manager Credential Provisioning & Management
    // -----------------------------------------------------------------------

    public BranchManagerCredentialsResponse provisionBranchManager(ProvisionBranchManagerRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException(email);
        }

        if (userRepository.findFirstByBranchIdAndRoles_RoleName(request.getBranchId(), RoleName.BRANCH_MANAGER)
                .isPresent()) {
            throw new BranchManagerAlreadyExistsException(request.getBranchId());
        }

        Role branchManagerRole = roleRepository.findByRoleName(RoleName.BRANCH_MANAGER)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: BRANCH_MANAGER"));

        String temporaryPassword = generateTemporaryPassword();

        User user = new User();
        String fullName = request.getFullName() != null && !request.getFullName().isBlank()
                ? request.getFullName().trim()
                : "Branch Manager";
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        user.setRoles(new HashSet<>(Set.of(branchManagerRole)));
        user.setBranchId(request.getBranchId());
        user.setOrganizationId(request.getOrganizationId() != null && !request.getOrganizationId().isBlank()
                ? request.getOrganizationId().trim()
                : null);
        user.setMustChangePassword(true);
        user.setTemporaryPassword(temporaryPassword);

        User saved = userRepository.save(user);
        log.info("Provisioned BRANCH_MANAGER account '{}' for branch {}", saved.getEmail(), saved.getBranchId());
        return toBranchManagerCredentialsResponse(saved);
    }

    @Transactional(readOnly = true)
    public BranchManagerCredentialsResponse getBranchManagerCredentials(Long branchId) {
        User branchManager = findBranchManagerOrThrow(branchId);
        return toBranchManagerCredentialsResponse(branchManager);
    }

    public BranchManagerCredentialsResponse resetBranchManagerCredentials(Long branchId, String adminEmail) {
        User branchManager = findBranchManagerOrThrow(branchId);

        String temporaryPassword = generateTemporaryPassword();
        branchManager.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        branchManager.setMustChangePassword(true);
        branchManager.setTemporaryPassword(temporaryPassword);

        refreshTokenRepository.revokeAllByUser(branchManager);
        User saved = userRepository.save(branchManager);

        log.info("Admin '{}' reset temporary credentials for BRANCH_MANAGER '{}' (branch {})",
                adminEmail, saved.getEmail(), branchId);
        return toBranchManagerCredentialsResponse(saved);
    }

    private User findBranchManagerOrThrow(Long branchId) {
        return userRepository.findFirstByBranchIdAndRoles_RoleName(branchId, RoleName.BRANCH_MANAGER)
                .orElseThrow(() -> new ResourceNotFoundException("Branch manager not found for branch: " + branchId));
    }

    private BranchManagerCredentialsResponse toBranchManagerCredentialsResponse(User user) {
        String activeTempPassword = user.isMustChangePassword() ? user.getTemporaryPassword() : null;
        return new BranchManagerCredentialsResponse(
                user.getUserId(),
                user.getBranchId(),
                user.getEmail(),
                user.isMustChangePassword(),
                activeTempPassword,
                user.getPasswordChangedAt()
        );
    }

    /**
     * Generates a 12-character policy-compliant random temporary password
     * containing at least one uppercase letter, lowercase letter, digit, and special character.
     */
    private String generateTemporaryPassword() {
        List<Character> chars = new ArrayList<>(12);
        chars.add(UPPER.charAt(SECURE_RANDOM.nextInt(UPPER.length())));
        chars.add(LOWER.charAt(SECURE_RANDOM.nextInt(LOWER.length())));
        chars.add(DIGITS.charAt(SECURE_RANDOM.nextInt(DIGITS.length())));
        chars.add(SPECIAL.charAt(SECURE_RANDOM.nextInt(SPECIAL.length())));
        for (int i = 4; i < 12; i++) {
            chars.add(ALL_PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(ALL_PASSWORD_CHARS.length())));
        }
        Collections.shuffle(chars, SECURE_RANDOM);
        StringBuilder sb = new StringBuilder(12);
        for (char c : chars) {
            sb.append(c);
        }
        return sb.toString();
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private boolean isLastActiveAdmin(User user) {
        if (!user.hasRole(RoleName.ADMIN)) {
            return false;
        }
        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            return false;
        }
        long activeAdminCount = userRepository.countByRoleNameAndAccountStatus(RoleName.ADMIN, AccountStatus.ACTIVE);
        return activeAdminCount <= 1;
    }

    private Set<Role> resolveRoles(List<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        if (roleNames == null || roleNames.isEmpty()) {
            roles.add(roleRepository.findByRoleName(RoleName.CUSTOMER)
                    .orElseThrow(() -> new ResourceNotFoundException("Default role CUSTOMER not found")));
            return roles;
        }

        for (String rName : roleNames) {
            try {
                RoleName name = RoleName.valueOf(rName.trim().toUpperCase());
                Role role = roleRepository.findByRoleName(name)
                        .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + name));
                roles.add(role);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Unknown role: " + rName);
            }
        }
        return roles;
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(r -> r.getRoleName().name())
                .sorted()
                .toList();

        AdminUserResponse response = new AdminUserResponse(
                user.getUserId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                roles,
                user.getAccountStatus().name(),
                user.isEmailVerified(),
                user.getAuthProvider().name(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getPasswordChangedAt()
        );
        response.setBranchId(user.getBranchId());
        response.setOrganizationId(user.getOrganizationId());
        return response;
    }
}

