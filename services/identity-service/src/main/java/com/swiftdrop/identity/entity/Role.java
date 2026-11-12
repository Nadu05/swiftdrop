package com.swiftdrop.identity.entity;

import jakarta.persistence.*;

/**
 * Role entity. Roles are seeded via Flyway (V3__seed_roles.sql).
 * Application code must never create roles dynamically.
 */
@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Long roleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_name", nullable = false, unique = true, length = 50)
    private RoleName roleName;

    public Role() {}

    public Role(RoleName roleName) {
        this.roleName = roleName;
    }

    // --- Getters and Setters ---

    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }

    public RoleName getRoleName() { return roleName; }
    public void setRoleName(RoleName roleName) { this.roleName = roleName; }
}

