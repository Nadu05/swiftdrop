package com.swiftdrop.identity.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.entity.AccountStatus;
import com.swiftdrop.identity.entity.RoleName;
import com.swiftdrop.identity.exception.GlobalExceptionHandler;
import com.swiftdrop.identity.security.JwtAuthenticationFilter;
import com.swiftdrop.identity.security.JwtService;
import com.swiftdrop.identity.service.AdminService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdminService adminService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("GET /api/v1/admin/stats - Success")
    @WithMockUser(roles = "ADMIN")
    void getStatsSuccess() throws Exception {
        AdminDashboardStatsResponse stats = new AdminDashboardStatsResponse(
                100L, 90L, 5L, 3L, 2L, Map.of("ADMIN", 2L, "CUSTOMER", 80L)
        );

        when(adminService.getDashboardStats()).thenReturn(stats);

        mockMvc.perform(get("/api/v1/admin/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(100))
                .andExpect(jsonPath("$.activeUsers").value(90))
                .andExpect(jsonPath("$.usersByRole.ADMIN").value(2));
    }

    @Test
    @DisplayName("GET /api/v1/admin/users - Success")
    @WithMockUser(roles = "ADMIN")
    void listUsersSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        AdminUserResponse userRes = new AdminUserResponse(
                userId, "Test User", "test@swiftdrop.io", "+1234567890",
                List.of("CUSTOMER"), "ACTIVE", true, "LOCAL",
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        PageResponse<AdminUserResponse> pageRes = new PageResponse<>(
                List.of(userRes), 0, 20, 1L, 1, true
        );

        when(adminService.listUsers(any(), any(), any(), any(Pageable.class))).thenReturn(pageRes);

        mockMvc.perform(get("/api/v1/admin/users")
                        .param("search", "test")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email").value("test@swiftdrop.io"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("POST /api/v1/admin/users - Success")
    @WithMockUser(roles = "ADMIN")
    void createUserSuccess() throws Exception {
        AdminCreateUserRequest req = new AdminCreateUserRequest(
                "New Courier", "courier@swiftdrop.io", "Pass1234!", "+1234567890",
                List.of("COURIER"), "ACTIVE", true
        );

        UUID userId = UUID.randomUUID();
        AdminUserResponse userRes = new AdminUserResponse(
                userId, "New Courier", "courier@swiftdrop.io", "+1234567890",
                List.of("COURIER"), "ACTIVE", true, "LOCAL",
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(adminService.createUser(any(AdminCreateUserRequest.class))).thenReturn(userRes);

        mockMvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("courier@swiftdrop.io"))
                .andExpect(jsonPath("$.roles[0]").value("COURIER"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{userId}/suspend - Success")
    @WithMockUser(username = "admin@swiftdrop.io", roles = "ADMIN")
    void suspendUserSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        AdminUserResponse userRes = new AdminUserResponse(
                userId, "Bad User", "bad@swiftdrop.io", null,
                List.of("CUSTOMER"), "SUSPENDED", false, "LOCAL",
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(adminService.suspendUser(eq(userId), any())).thenReturn(userRes);

        mockMvc.perform(post("/api/v1/admin/users/" + userId + "/suspend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountStatus").value("SUSPENDED"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{userId}/activate - Success")
    @WithMockUser(username = "admin@swiftdrop.io", roles = "ADMIN")
    void activateUserSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        AdminUserResponse userRes = new AdminUserResponse(
                userId, "Good User", "good@swiftdrop.io", null,
                List.of("CUSTOMER"), "ACTIVE", true, "LOCAL",
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(adminService.activateUser(eq(userId), any())).thenReturn(userRes);

        mockMvc.perform(post("/api/v1/admin/users/" + userId + "/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE"));
    }

    @Test
    @DisplayName("GET /api/v1/admin/roles - Success")
    @WithMockUser(roles = "ADMIN")
    void listRolesSuccess() throws Exception {
        List<RoleResponse> roles = List.of(
                new RoleResponse(1L, "CUSTOMER", "Customer operations", 80L),
                new RoleResponse(5L, "ADMIN", "System administration", 2L)
        );

        when(adminService.listRoles()).thenReturn(roles);

        mockMvc.perform(get("/api/v1/admin/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].roleName").value("CUSTOMER"))
                .andExpect(jsonPath("$[1].roleName").value("ADMIN"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{userId}/roles - Success")
    @WithMockUser(username = "admin@swiftdrop.io", roles = "ADMIN")
    void assignRoleSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        AssignRoleRequest req = new AssignRoleRequest("DISPATCHER");

        AdminUserResponse userRes = new AdminUserResponse(
                userId, "Dispatcher User", "dispatcher@swiftdrop.io", null,
                List.of("CUSTOMER", "DISPATCHER"), "ACTIVE", true, "LOCAL",
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(adminService.assignRole(eq(userId), eq(RoleName.DISPATCHER), any()))
                .thenReturn(userRes);

        mockMvc.perform(post("/api/v1/admin/users/" + userId + "/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles").isArray());
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/users/{userId}/roles/{roleId} - Success")
    @WithMockUser(username = "admin@swiftdrop.io", roles = "ADMIN")
    void removeRoleSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        AdminUserResponse userRes = new AdminUserResponse(
                userId, "Regular User", "user@swiftdrop.io", null,
                List.of("CUSTOMER"), "ACTIVE", true, "LOCAL",
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(adminService.removeRole(eq(userId), eq(2L), any()))
                .thenReturn(userRes);

        mockMvc.perform(delete("/api/v1/admin/users/" + userId + "/roles/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("CUSTOMER"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/branch-managers/provision - Success returns 201")
    @WithMockUser(roles = "ADMIN")
    void provisionBranchManagerSuccess() throws Exception {
        ProvisionBranchManagerRequest req = new ProvisionBranchManagerRequest(
                42L, "colombo@swiftdrop.lk", "Colombo Manager", null);
        BranchManagerCredentialsResponse res = new BranchManagerCredentialsResponse(
                UUID.randomUUID(), 42L, "colombo@swiftdrop.lk", true, "TempPass123!", null);

        when(adminService.provisionBranchManager(any(ProvisionBranchManagerRequest.class)))
                .thenReturn(res);

        mockMvc.perform(post("/api/v1/admin/branch-managers/provision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.branchId").value(42))
                .andExpect(jsonPath("$.email").value("colombo@swiftdrop.lk"))
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andExpect(jsonPath("$.temporaryPassword").value("TempPass123!"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/branch-managers/provision - Duplicate email returns 409 Conflict")
    @WithMockUser(roles = "HEAD_OFFICE_ADMIN")
    void provisionBranchManagerDuplicateEmail() throws Exception {
        ProvisionBranchManagerRequest req = new ProvisionBranchManagerRequest(
                42L, "existing@swiftdrop.lk", null, null);

        when(adminService.provisionBranchManager(any(ProvisionBranchManagerRequest.class)))
                .thenThrow(new com.swiftdrop.identity.exception.DuplicateEmailException("existing@swiftdrop.lk"));

        mockMvc.perform(post("/api/v1/admin/branch-managers/provision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("GET /api/v1/admin/branch-managers/{branchId}/credentials - Success")
    @WithMockUser(roles = "ADMIN")
    void getBranchManagerCredentialsSuccess() throws Exception {
        BranchManagerCredentialsResponse res = new BranchManagerCredentialsResponse(
                UUID.randomUUID(), 42L, "colombo@swiftdrop.lk", false, null, LocalDateTime.now());

        when(adminService.getBranchManagerCredentials(42L)).thenReturn(res);

        mockMvc.perform(get("/api/v1/admin/branch-managers/42/credentials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchId").value(42))
                .andExpect(jsonPath("$.email").value("colombo@swiftdrop.lk"))
                .andExpect(jsonPath("$.mustChangePassword").value(false))
                .andExpect(jsonPath("$.temporaryPassword").isEmpty());
    }

    @Test
    @DisplayName("GET /api/v1/admin/branch-managers/{branchId}/credentials - Not found returns 404")
    @WithMockUser(roles = "HEAD_OFFICE_ADMIN")
    void getBranchManagerCredentialsNotFound() throws Exception {
        when(adminService.getBranchManagerCredentials(99L))
                .thenThrow(new com.swiftdrop.identity.exception.ResourceNotFoundException("Branch manager not found for branch: 99"));

        mockMvc.perform(get("/api/v1/admin/branch-managers/99/credentials"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/v1/admin/branch-managers/{branchId}/credentials/reset - Success")
    @WithMockUser(username = "admin@swiftdrop.io", roles = "ADMIN")
    void resetBranchManagerCredentialsSuccess() throws Exception {
        BranchManagerCredentialsResponse res = new BranchManagerCredentialsResponse(
                UUID.randomUUID(), 42L, "colombo@swiftdrop.lk", true, "NewTemp99!", null);

        when(adminService.resetBranchManagerCredentials(eq(42L), any())).thenReturn(res);

        mockMvc.perform(post("/api/v1/admin/branch-managers/42/credentials/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchId").value(42))
                .andExpect(jsonPath("$.email").value("colombo@swiftdrop.lk"))
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andExpect(jsonPath("$.temporaryPassword").value("NewTemp99!"));
    }
}

