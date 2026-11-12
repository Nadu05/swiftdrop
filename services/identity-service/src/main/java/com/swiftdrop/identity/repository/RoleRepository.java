package com.swiftdrop.identity.repository;

import com.swiftdrop.identity.entity.Role;
import com.swiftdrop.identity.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByRoleName(RoleName roleName);
}

