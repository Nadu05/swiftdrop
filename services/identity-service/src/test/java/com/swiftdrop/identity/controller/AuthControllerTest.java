package com.swiftdrop.identity.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.identity.dto.AuthResponse;
import com.swiftdrop.identity.dto.LoginRequest;
import com.swiftdrop.identity.dto.RegisterRequest;
import com.swiftdrop.identity.exception.DuplicateEmailException;
import com.swiftdrop.identity.exception.GlobalExceptionHandler;
import com.swiftdrop.identity.exception.InvalidCredentialsException;
import com.swiftdrop.identity.security.JwtAuthenticationFilter;
import com.swiftdrop.identity.security.JwtService;
import com.swiftdrop.identity.service.AuthService;
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

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // focus on controller validation & handler mapping
@Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("POST /auth/register - Success returns 201 Created")
    void registerSuccess() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("Jane Doe");
        req.setEmail("jane.doe@example.com");
        req.setPhone("+1234567890");
        req.setPassword("ValidPass123!");
        req.setConfirmPassword("ValidPass123!");

        AuthResponse authRes = new AuthResponse(
                UUID.randomUUID(),
                "Jane Doe",
                "jane.doe@example.com",
                "+1234567890",
                List.of("CUSTOMER"),
                "ACTIVE",
                LocalDateTime.now()
        );

        when(authService.register(any(), any())).thenReturn(authRes);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("jane.doe@example.com"))
                .andExpect(jsonPath("$.fullName").value("Jane Doe"))
                .andExpect(jsonPath("$.roles[0]").value("CUSTOMER"));
    }

    @Test
    @DisplayName("POST /auth/register - Validation error on invalid email")
    void registerInvalidEmail() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("Jane Doe");
        req.setEmail("not-an-email");
        req.setPhone("+1234567890");
        req.setPassword("ValidPass123!");
        req.setConfirmPassword("ValidPass123!");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email", containsString("valid email address")));
    }

    @Test
    @DisplayName("POST /auth/register - Validation error on weak password")
    void registerWeakPassword() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("Jane Doe");
        req.setEmail("jane@example.com");
        req.setPhone("+1234567890");
        req.setPassword("weak");
        req.setConfirmPassword("weak");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password", containsString("at least 8 characters")));
    }

    @Test
    @DisplayName("POST /auth/register - Conflict 409 when email exists")
    void registerDuplicateEmail() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("Jane Doe");
        req.setEmail("existing@example.com");
        req.setPhone("+1234567890");
        req.setPassword("ValidPass123!");
        req.setConfirmPassword("ValidPass123!");

        when(authService.register(any(), any()))
                .thenThrow(new DuplicateEmailException("existing@example.com"));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("POST /auth/login - Success returns 200 OK")
    void loginSuccess() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("jane@example.com");
        req.setPassword("ValidPass123!");

        AuthResponse authRes = new AuthResponse(
                UUID.randomUUID(),
                "Jane Doe",
                "jane@example.com",
                "+1234567890",
                List.of("CUSTOMER"),
                "ACTIVE",
                LocalDateTime.now()
        );

        when(authService.login(any(), any())).thenReturn(authRes);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jane@example.com"));
    }

    @Test
    @DisplayName("POST /auth/login - 401 Unauthorized on invalid credentials")
    void loginInvalidCredentials() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("jane@example.com");
        req.setPassword("WrongPassword!");

        when(authService.login(any(), any())).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("GET /auth/me - Returns current user profile")
    @WithMockUser(username = "jane@example.com", roles = {"CUSTOMER"})
    void getMeSuccess() throws Exception {
        AuthResponse authRes = new AuthResponse(
                UUID.randomUUID(),
                "Jane Doe",
                "jane@example.com",
                "+1234567890",
                List.of("CUSTOMER"),
                "ACTIVE",
                LocalDateTime.now()
        );

        when(authService.getCurrentUser("jane@example.com")).thenReturn(authRes);

        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jane@example.com"));
    }

    @Test
    @DisplayName("POST /auth/logout - Returns 204 No Content")
    void logoutSuccess() throws Exception {
        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isNoContent());
    }
}

