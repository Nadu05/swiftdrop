package com.swiftdrop.identity.dto;

public class RoleResponse {

    private Long roleId;
    private String roleName;
    private String description;
    private long userCount;

    public RoleResponse() {}

    public RoleResponse(Long roleId, String roleName, String description, long userCount) {
        this.roleId = roleId;
        this.roleName = roleName;
        this.description = description;
        this.userCount = userCount;
    }

    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public long getUserCount() { return userCount; }
    public void setUserCount(long userCount) { this.userCount = userCount; }
}

