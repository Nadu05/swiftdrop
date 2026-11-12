package com.swiftdrop.identity.controller;

import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication REST controller.
 *
 * Supports /api/v1/auth, /auth, and root mappings for flexible API Gateway routing.
 */
@RestController
@RequestMapping({"/api/v1/auth", "/auth", ""})
@Tag(name = "Authentication", description = "Registration, login, Google OAuth, and session management")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // -----------------------------------------------------------------------
    // POST /auth/register
    // -----------------------------------------------------------------------

    @PostMapping("/register")
    @Operation(
        summary = "Register a new customer account",
        description = "Creates a new CUSTOMER account. Sets HttpOnly JWT cookies on success.",
        responses = {
            @ApiResponse(responseCode = "201", description = "Account created"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "409", description = "Email already registered")
        }
    )
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {

        AuthResponse body = authService.register(request, response);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    // -----------------------------------------------------------------------
    // POST /auth/login
    // -----------------------------------------------------------------------

    @PostMapping("/login")
    @Operation(
        summary = "Email/password login",
        description = "Authenticates with email and password. Sets HttpOnly JWT cookies on success.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Authenticated"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials"),
            @ApiResponse(responseCode = "403", description = "Account disabled")
        }
    )
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        return ResponseEntity.ok(authService.login(request, response));
    }

    // -----------------------------------------------------------------------
    // POST /auth/google
    // -----------------------------------------------------------------------

    @PostMapping("/google")
    @Operation(
        summary = "Google OAuth 2.0 authentication",
        description = "Verifies a Google ID token and logs in or registers the user.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Authenticated"),
            @ApiResponse(responseCode = "400", description = "Invalid Google token"),
            @ApiResponse(responseCode = "403", description = "Account disabled")
        }
    )
    public ResponseEntity<AuthResponse> googleAuth(
            @Valid @RequestBody GoogleAuthRequest request,
            HttpServletResponse response) {

        return ResponseEntity.ok(authService.googleAuth(request, response));
    }

    // -----------------------------------------------------------------------
    // POST /auth/refresh
    // -----------------------------------------------------------------------

    @PostMapping("/refresh")
    @Operation(
        summary = "Refresh access token",
        description = "Reads the refresh token cookie, rotates tokens, and issues new cookies.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Tokens refreshed"),
            @ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")
        }
    )
    public ResponseEntity<AuthResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {

        return ResponseEntity.ok(authService.refresh(request, response));
    }

    // -----------------------------------------------------------------------
    // GET /auth/me
    // -----------------------------------------------------------------------

    @GetMapping("/me")
    @SecurityRequirement(name = "cookieAuth")
    @Operation(
        summary = "Get current authenticated user",
        description = "Returns the profile of the currently authenticated user.",
        responses = {
            @ApiResponse(responseCode = "200", description = "User profile returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
        }
    )
    public ResponseEntity<AuthResponse> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {

        // The principal name is the user's email (set by JwtAuthenticationFilter)
        return ResponseEntity.ok(authService.getCurrentUser(userDetails.getUsername()));
    }

    // -----------------------------------------------------------------------
    // POST /auth/logout
    // -----------------------------------------------------------------------

    @PostMapping("/logout")
    @SecurityRequirement(name = "cookieAuth")
    @Operation(
        summary = "Logout",
        description = "Revokes the refresh token and clears authentication cookies.",
        responses = {
            @ApiResponse(responseCode = "204", description = "Logged out successfully")
        }
    )
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        authService.logout(request, response);
        return ResponseEntity.noContent().build();
    }
}

