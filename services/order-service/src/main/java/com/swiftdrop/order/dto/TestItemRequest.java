package com.swiftdrop.order.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public class TestItemRequest {
    @NotBlank(message = "Name is required") @Size(max = 255) private String name;
    @Size(max = 1000) private String description;
    @Size(max = 50) private String status;
    public TestItemRequest() {} public TestItemRequest(String name, String description, String status) { this.name = name; this.description = description; this.status = status; }
    public String getName() { return name; } public void setName(String name) { this.name = name; }
    public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
}
