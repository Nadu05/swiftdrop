package com.swiftdrop.identity.entity;

import jakarta.persistence.*;
import java.util.Objects;

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

    public String getDescription() {
        if (roleName == null) return "";
        return switch (roleName) {
            case CUSTOMER -> "Customer delivery operations";
            case MERCHANT -> "Merchant platform access";
            case COURIER -> "Courier delivery operations";
            case DISPATCHER -> "Dispatch and logistics";
            case ADMIN -> "System administration";
        };
    }

    // --- Getters and Setters ---

    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }

    public RoleName getRoleName() { return roleName; }
    public void setRoleName(RoleName roleName) { this.roleName = roleName; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Role role = (Role) o;
        return roleName == role.roleName;
    }

    @Override
    public int hashCode() {
        return Objects.hash(roleName);
    }
}
