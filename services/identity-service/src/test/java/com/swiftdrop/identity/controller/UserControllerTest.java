package com.swiftdrop.identity.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.exception.GlobalExceptionHandler;
import com.swiftdrop.identity.security.JwtAuthenticationFilter;
import com.swiftdrop.identity.security.JwtService;
import com.swiftdrop.identity.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("GET /api/v1/users/me - Success")
    @WithMockUser(username = "jane@example.com")
    void getProfileSuccess() throws Exception {
        UserProfileResponse res = new UserProfileResponse(
                UUID.randomUUID(),
                "Jane Doe",
                "jane@example.com",
                "+1234567890",
                List.of("CUSTOMER"),
                "ACTIVE",
                true,
                LocalDateTime.now(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(userService.getProfile("jane@example.com")).thenReturn(res);

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jane@example.com"))
                .andExpect(jsonPath("$.fullName").value("Jane Doe"))
                .andExpect(jsonPath("$.emailVerified").value(true));
    }

    @Test
    @DisplayName("PUT /api/v1/users/me - Success")
    @WithMockUser(username = "jane@example.com")
    void updateProfileSuccess() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest("Jane Updated", "jane@example.com", "+1987654321");
        UserProfileResponse res = new UserProfileResponse(
                UUID.randomUUID(),
                "Jane Updated",
                "jane@example.com",
                "+1987654321",
                List.of("CUSTOMER"),
                "ACTIVE",
                true,
                LocalDateTime.now(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(userService.updateProfile(eq("jane@example.com"), any(UpdateProfileRequest.class))).thenReturn(res);

        mockMvc.perform(put("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Jane Updated"))
                .andExpect(jsonPath("$.phone").value("+1987654321"));
    }

    @Test
    @DisplayName("GET /api/v1/users/me/account - Success")
    @WithMockUser(username = "jane@example.com")
    void getAccountDetailsSuccess() throws Exception {
        AccountDetailsResponse res = new AccountDetailsResponse(
                UUID.randomUUID(),
                "jane@example.com",
                "LOCAL",
                "ACTIVE",
                true,
                LocalDateTime.now(),
                null,
                List.of("CUSTOMER"),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(userService.getAccountDetails("jane@example.com")).thenReturn(res);

        mockMvc.perform(get("/api/v1/users/me/account"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jane@example.com"))
                .andExpect(jsonPath("$.authProvider").value("LOCAL"))
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE"));
    }

    @Test
    @DisplayName("DELETE /api/v1/users/me - Deactivate account")
    @WithMockUser(username = "jane@example.com")
    void deactivateAccountSuccess() throws Exception {
        mockMvc.perform(delete("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Account successfully deactivated"));

        verify(userService).deactivateAccount(eq("jane@example.com"), any(), any());
    }

    @Test
    @DisplayName("GET /api/v1/users/me/email-verification - Check status")
    @WithMockUser(username = "jane@example.com")
    void getEmailVerificationStatusSuccess() throws Exception {
        EmailVerificationStatusResponse res =
                new EmailVerificationStatusResponse("jane@example.com", true, LocalDateTime.now());

        when(userService.getEmailVerificationStatus("jane@example.com")).thenReturn(res);

        mockMvc.perform(get("/api/v1/users/me/email-verification"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jane@example.com"))
                .andExpect(jsonPath("$.emailVerified").value(true));
    }
}

