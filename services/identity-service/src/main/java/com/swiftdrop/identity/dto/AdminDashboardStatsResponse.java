package com.swiftdrop.identity.dto;

import java.util.Map;

public class AdminDashboardStatsResponse {

    private long totalUsers;
    private long activeUsers;
    private long suspendedUsers;
    private long deactivatedUsers;
    private long pendingVerificationUsers;
    private Map<String, Long> usersByRole;

    public AdminDashboardStatsResponse() {}

    public AdminDashboardStatsResponse(long totalUsers, long activeUsers, long suspendedUsers,
                                       long deactivatedUsers, long pendingVerificationUsers,
                                       Map<String, Long> usersByRole) {
        this.totalUsers = totalUsers;
        this.activeUsers = activeUsers;
        this.suspendedUsers = suspendedUsers;
        this.deactivatedUsers = deactivatedUsers;
        this.pendingVerificationUsers = pendingVerificationUsers;
        this.usersByRole = usersByRole;
    }

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getActiveUsers() { return activeUsers; }
    public void setActiveUsers(long activeUsers) { this.activeUsers = activeUsers; }

    public long getSuspendedUsers() { return suspendedUsers; }
    public void setSuspendedUsers(long suspendedUsers) { this.suspendedUsers = suspendedUsers; }

    public long getDeactivatedUsers() { return deactivatedUsers; }
    public void setDeactivatedUsers(long deactivatedUsers) { this.deactivatedUsers = deactivatedUsers; }

    public long getPendingVerificationUsers() { return pendingVerificationUsers; }
    public void setPendingVerificationUsers(long pendingVerificationUsers) { this.pendingVerificationUsers = pendingVerificationUsers; }

    public Map<String, Long> getUsersByRole() { return usersByRole; }
    public void setUsersByRole(Map<String, Long> usersByRole) { this.usersByRole = usersByRole; }
}

