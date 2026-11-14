package com.swiftdrop.identity.config;

import com.swiftdrop.identity.entity.AccountStatus;
import com.swiftdrop.identity.entity.AuthProvider;
import com.swiftdrop.identity.entity.Role;
import com.swiftdrop.identity.entity.RoleName;
import com.swiftdrop.identity.entity.User;
import com.swiftdrop.identity.repository.RoleRepository;
import com.swiftdrop.identity.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Ensures baseline system accounts (Admin, Head Office Admin, Dispatcher,
 * Branch Manager, Branch Staff, Courier, Merchant, and Customer) exist on startup.
 */
@Component
@ConditionalOnProperty(name = "app.bootstrap.seed-default-users", havingValue = "true", matchIfMissing = true)
public class DefaultAccountsInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DefaultAccountsInitializer.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final String defaultPassword;

    public DefaultAccountsInitializer(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.default-password:password123}") String defaultPassword) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.defaultPassword = defaultPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<SeedAccount> accounts = List.of(
                new SeedAccount(
                        "System Administrator",
                        "admin@swiftdrop.lk",
                        "+94770000001",
                        List.of(RoleName.ADMIN, RoleName.HEAD_OFFICE_ADMIN),
                        1L,
                        null
                ),
                new SeedAccount(
                        "Head Office Administrator",
                        "headoffice@swiftdrop.lk",
                        "+94770000002",
                        List.of(RoleName.HEAD_OFFICE_ADMIN, RoleName.ADMIN),
                        1L,
                        null
                ),
                new SeedAccount(
                        "Colombo Central Dispatcher",
                        "dispatcher@swiftdrop.lk",
                        "+94770000003",
                        List.of(RoleName.DISPATCHER),
                        1L,
                        null
                ),
                new SeedAccount(
                        "Kandy Hub Dispatcher",
                        "dispatcher.kandy@swiftdrop.lk",
                        "+94770000004",
                        List.of(RoleName.DISPATCHER),
                        2L,
                        null
                ),
                new SeedAccount(
                        "Colombo Branch Manager",
                        "manager.cmb@swiftdrop.lk",
                        "+94770000005",
                        List.of(RoleName.BRANCH_MANAGER),
                        1L,
                        null
                ),
                new SeedAccount(
                        "Colombo Branch Staff",
                        "staff.cmb@swiftdrop.lk",
                        "+94770000006",
                        List.of(RoleName.BRANCH_STAFF),
                        1L,
                        null
                ),
                new SeedAccount(
                        "Kamal Silva (Courier)",
                        "courier@swiftdrop.lk",
                        "+94771234560",
                        List.of(RoleName.COURIER),
                        1L,
                        null
                ),
                new SeedAccount(
                        "Kamal Silva (CR-101)",
                        "kamal.silva@swiftdrop.lk",
                        "+94771234567",
                        List.of(RoleName.COURIER),
                        1L,
                        null
                ),
                new SeedAccount(
                        "Mahesh Alwis (CR-105 Kandy)",
                        "mahesh.a@swiftdrop.lk",
                        "+94786669900",
                        List.of(RoleName.COURIER),
                        2L,
                        null
                ),
                new SeedAccount(
                        "Ceylon Organic Tea Exports",
                        "merchant@swiftdrop.lk",
                        "+94772345678",
                        List.of(RoleName.MERCHANT, RoleName.CUSTOMER),
                        1L,
                        "APP-2026-0812"
                ),
                new SeedAccount(
                        "Nimal Perera (Customer)",
                        "customer@swiftdrop.lk",
                        "+94779998877",
                        List.of(RoleName.CUSTOMER),
                        null,
                        null
                )
        );

        int createdCount = 0;
        for (SeedAccount spec : accounts) {
            Set<Role> resolvedRoles = spec.roles().stream()
                    .map(this::getOrCreateRole)
                    .collect(Collectors.toSet());

            User existing = userRepository.findByEmail(spec.email()).orElse(null);
            if (existing == null) {
                User user = new User();
                user.setFullName(spec.fullName());
                user.setEmail(spec.email());
                user.setPhone(spec.phone());
                user.setPasswordHash(passwordEncoder.encode(defaultPassword));
                user.setAccountStatus(AccountStatus.ACTIVE);
                user.setAuthProvider(AuthProvider.LOCAL);
                user.setEmailVerified(true);
                user.setEmailVerifiedAt(LocalDateTime.now());
                user.setBranchId(spec.branchId());
                user.setOrganizationId(spec.organizationId());
                user.setRoles(resolvedRoles);
                userRepository.save(user);
                createdCount++;
            } else {
                boolean updated = false;
                for (Role r : resolvedRoles) {
                    if (!existing.hasRole(r.getRoleName())) {
                        existing.addRole(r);
                        updated = true;
                    }
                }
                if (existing.getBranchId() == null && spec.branchId() != null) {
                    existing.setBranchId(spec.branchId());
                    updated = true;
                }
                if (existing.getOrganizationId() == null && spec.organizationId() != null) {
                    existing.setOrganizationId(spec.organizationId());
                    updated = true;
                }
                if (updated) {
                    userRepository.save(existing);
                }
            }
        }

        if (createdCount > 0) {
            log.info("Seeded {} default SwiftDrop user accounts (admin@swiftdrop.lk, dispatcher@swiftdrop.lk, courier@swiftdrop.lk, merchant@swiftdrop.lk, customer@swiftdrop.lk)", createdCount);
        }
    }

    private Role getOrCreateRole(RoleName roleName) {
        return roleRepository.findByRoleName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName)));
    }

    private record SeedAccount(
            String fullName,
            String email,
            String phone,
            List<RoleName> roles,
            Long branchId,
            String organizationId
    ) {
    }
}
