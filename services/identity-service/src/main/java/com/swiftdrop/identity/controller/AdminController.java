package com.swiftdrop.identity.controller;

import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.entity.AccountStatus;
import com.swiftdrop.identity.entity.RoleName;
import com.swiftdrop.identity.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/admin", "/admin"})
@PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OFFICE_ADMIN')")
@Tag(name = "Administration", description = "User administration and role-based access control")
@SecurityRequirement(name = "cookieAuth")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // -----------------------------------------------------------------------
    // Dashboard Stats
    // -----------------------------------------------------------------------

    @GetMapping("/stats")
    @Operation(summary = "Get admin dashboard statistics")
    public ResponseEntity<AdminDashboardStatsResponse> getStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // -----------------------------------------------------------------------
    // User Administration
    // -----------------------------------------------------------------------

    @GetMapping("/users")
    @Operation(summary = "List users with search, filtering, and pagination")
    public ResponseEntity<PageResponse<AdminUserResponse>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) RoleName role,
            @RequestParam(required = false) AccountStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(adminService.listUsers(search, role, status, pageable));
    }

    @GetMapping("/users/{userId}")
    @Operation(summary = "Get user details by ID")
    public ResponseEntity<AdminUserResponse> getUserById(@PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.getUserById(userId));
    }

    @PostMapping("/users")
    @Operation(summary = "Administratively create an authorized user")
    public ResponseEntity<AdminUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        AdminUserResponse created = adminService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/users/{userId}")
    @Operation(summary = "Update user details, roles, or status")
    public ResponseEntity<AdminUserResponse> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody AdminUpdateUserRequest request,
            Authentication auth
    ) {
        String adminEmail = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(adminService.updateUser(userId, request, adminEmail));
    }

    @PatchMapping("/users/{userId}/status")
    @Operation(summary = "Update account status (ACTIVE, SUSPENDED, DEACTIVATED)")
    public ResponseEntity<AdminUserResponse> updateAccountStatus(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateAccountStatusRequest request,
            Authentication auth
    ) {
        String adminEmail = auth != null ? auth.getName() : "system";
        AccountStatus status = AccountStatus.valueOf(request.getStatus().toUpperCase());
        return ResponseEntity.ok(adminService.updateAccountStatus(userId, status, adminEmail));
    }

    @PostMapping("/users/{userId}/activate")
    @Operation(summary = "Activate a user account")
    public ResponseEntity<AdminUserResponse> activateUser(
            @PathVariable UUID userId,
            Authentication auth
    ) {
        String adminEmail = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(adminService.activateUser(userId, adminEmail));
    }

    @PostMapping("/users/{userId}/suspend")
    @Operation(summary = "Suspend a user account and revoke all active sessions")
    public ResponseEntity<AdminUserResponse> suspendUser(
            @PathVariable UUID userId,
            Authentication auth
    ) {
        String adminEmail = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(adminService.suspendUser(userId, adminEmail));
    }

    // -----------------------------------------------------------------------
    // Role Management
    // -----------------------------------------------------------------------

    @GetMapping("/roles")
    @Operation(summary = "List all canonical platform roles with user counts")
    public ResponseEntity<List<RoleResponse>> listRoles() {
        return ResponseEntity.ok(adminService.listRoles());
    }

    @GetMapping("/roles/{roleId}")
    @Operation(summary = "Get role details by ID")
    public ResponseEntity<RoleResponse> getRoleById(@PathVariable Long roleId) {
        return ResponseEntity.ok(adminService.getRoleById(roleId));
    }

    @GetMapping("/roles/{roleId}/users")
    @Operation(summary = "List users assigned to a specific role")
    public ResponseEntity<PageResponse<AdminUserResponse>> getUsersByRole(
            @PathVariable Long roleId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(adminService.getUsersByRoleId(roleId, pageable));
    }

    @PostMapping("/users/{userId}/roles")
    @Operation(summary = "Assign a role to a user")
    public ResponseEntity<AdminUserResponse> assignRole(
            @PathVariable UUID userId,
            @Valid @RequestBody AssignRoleRequest request,
            Authentication auth
    ) {
        String adminEmail = auth != null ? auth.getName() : "system";
        RoleName roleName = RoleName.valueOf(request.getRoleName().toUpperCase());
        return ResponseEntity.ok(adminService.assignRole(userId, roleName, adminEmail));
    }

    @DeleteMapping("/users/{userId}/roles/{roleId}")
    @Operation(summary = "Remove a role from a user")
    public ResponseEntity<AdminUserResponse> removeRole(
            @PathVariable UUID userId,
            @PathVariable Long roleId,
            Authentication auth
    ) {
        String adminEmail = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(adminService.removeRole(userId, roleId, adminEmail));
    }

    // -----------------------------------------------------------------------
    // Branch Manager Credential Provisioning & Management
    // -----------------------------------------------------------------------

    @PostMapping("/branch-managers/provision")
    @Operation(summary = "Provision a BRANCH_MANAGER account for a branch with a temporary password")
    public ResponseEntity<BranchManagerCredentialsResponse> provisionBranchManager(
            @Valid @RequestBody ProvisionBranchManagerRequest request
    ) {
        BranchManagerCredentialsResponse created = adminService.provisionBranchManager(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/branch-managers/{branchId}/credentials")
    @Operation(summary = "Get Branch Manager credential status by branch ID")
    public ResponseEntity<BranchManagerCredentialsResponse> getBranchManagerCredentials(
            @PathVariable Long branchId
    ) {
        return ResponseEntity.ok(adminService.getBranchManagerCredentials(branchId));
    }

    @PostMapping("/branch-managers/{branchId}/credentials/reset")
    @Operation(summary = "Reset Branch Manager credentials by branch ID and generate a new temporary password")
    public ResponseEntity<BranchManagerCredentialsResponse> resetBranchManagerCredentials(
            @PathVariable Long branchId,
            Authentication auth
    ) {
        String adminEmail = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(adminService.resetBranchManagerCredentials(branchId, adminEmail));
    }
}

