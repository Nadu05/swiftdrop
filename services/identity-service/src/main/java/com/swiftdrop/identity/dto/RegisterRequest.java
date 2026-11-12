package com.swiftdrop.identity.dto;

import jakarta.validation.constraints.*;

/**
 * Request DTO for public customer registration.
 * Only the CUSTOMER role is assigned — roles cannot be specified by the caller.
 */
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    /**
     * Phone in E.164 or common local format.
     * Pattern allows optional +, country code digits, spaces, dashes, and parentheses.
     */
    @NotBlank(message = "Phone number is required")
    @Pattern(
        regexp = "^\\+?[0-9\\s\\-().]{7,20}$",
        message = "Phone number must be a valid format (7-20 digits, may include +, spaces, dashes)"
    )
    private String phone;

    /**
     * Minimum 8 characters, at least one uppercase letter, one digit, and one special character.
     */
    @NotBlank(message = "Password is required")
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$",
        message = "Password must be at least 8 characters and contain at least one uppercase letter, one digit, and one special character"
    )
    private String password;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;

    // --- Getters and Setters ---

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
}

