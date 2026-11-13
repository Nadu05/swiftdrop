package com.swiftdrop.identity.controller;

import com.swiftdrop.identity.dto.*;
import com.swiftdrop.identity.exception.InvalidCredentialsException;
import com.swiftdrop.identity.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/users", "/users"})
@Tag(name = "User Profile & Account", description = "User profile management, account lifecycle and verification")
@SecurityRequirement(name = "cookieAuth")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Returns profile details for the authenticated user")
    public ResponseEntity<UserProfileResponse> getProfile(@AuthenticationPrincipal Object principal) {
        String email = resolveEmail(principal);
        return ResponseEntity.ok(userService.getProfile(email));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile", description = "Updates full name, phone number, and optionally email")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal Object principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        String email = resolveEmail(principal);
        return ResponseEntity.ok(userService.updateProfile(email, request));
    }

    @GetMapping("/me/account")
    @Operation(summary = "Get account details", description = "Returns metadata and status for the authenticated user account")
    public ResponseEntity<AccountDetailsResponse> getAccountDetails(@AuthenticationPrincipal Object principal) {
        String email = resolveEmail(principal);
        return ResponseEntity.ok(userService.getAccountDetails(email));
    }

    @DeleteMapping("/me")
    @Operation(summary = "Deactivate account", description = "Deactivates the current user account and revokes active sessions")
    public ResponseEntity<com.swiftdrop.identity.dto.ApiResponse> deactivateAccount(
            @AuthenticationPrincipal Object principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        String email = resolveEmail(principal);
        userService.deactivateAccount(email, request, response);
        return ResponseEntity.ok(com.swiftdrop.identity.dto.ApiResponse.ok("Account successfully deactivated"));
    }

    @GetMapping("/me/email-verification")
    @Operation(summary = "Get email verification status", description = "Checks whether the user's email has been verified")
    public ResponseEntity<EmailVerificationStatusResponse> getEmailVerificationStatus(
            @AuthenticationPrincipal Object principal) {
        String email = resolveEmail(principal);
        return ResponseEntity.ok(userService.getEmailVerificationStatus(email));
    }

    private String resolveEmail(Object principal) {
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        } else if (principal instanceof String s) {
            return s;
        } else if (principal != null) {
            return principal.toString();
        }
        throw new InvalidCredentialsException();
    }
}

