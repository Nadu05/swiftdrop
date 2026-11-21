package com.swiftdrop.identity.repository;

import com.swiftdrop.identity.entity.AccountStatus;
import com.swiftdrop.identity.entity.AuthProvider;
import com.swiftdrop.identity.entity.RoleName;
import com.swiftdrop.identity.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByAuthProviderAndProviderUserId(AuthProvider authProvider, String providerUserId);

    long countByAccountStatus(AccountStatus status);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.roleName = :roleName")
    long countByRoleName(@Param("roleName") RoleName roleName);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.roleName = :roleName AND u.accountStatus = :status")
    long countByRoleNameAndAccountStatus(@Param("roleName") RoleName roleName, @Param("status") AccountStatus status);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.roleId = :roleId")
    Page<User> findByRoleId(@Param("roleId") Long roleId, Pageable pageable);

    Optional<User> findFirstByBranchIdAndRoles_RoleName(Long branchId, RoleName roleName);
}
