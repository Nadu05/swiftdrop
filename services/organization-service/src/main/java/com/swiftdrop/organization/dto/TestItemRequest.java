package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TestItemRequest {
    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must be at most 255 characters")
    private String name;
    @Size(max = 1000, message = "Description must be at most 1000 characters")
    private String description;
    @Size(max = 50, message = "Status must be at most 50 characters")
    private String status;

    public TestItemRequest() {}
    public TestItemRequest(String name, String description, String status) { this.name = name; this.description = description; this.status = status; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
