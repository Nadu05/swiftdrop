package com.swiftdrop.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    private String fullName;

    @Email(message = "Please provide a valid email address")
    @Size(max = 255, message = "Email address cannot exceed 255 characters")
    private String email;

    @Pattern(
        regexp = "^\\+?[0-9\\s\\-().]{7,20}$",
        message = "Phone number must be between 7 and 20 digits and may include +, dashes, or spaces"
    )
    private String phone;

    public UpdateProfileRequest() {}

    public UpdateProfileRequest(String fullName, String email, String phone) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}

