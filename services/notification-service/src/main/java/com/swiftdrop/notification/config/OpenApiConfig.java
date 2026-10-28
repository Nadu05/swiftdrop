package com.swiftdrop.notification.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "SwiftDrop Notification Service API", version = "1.0", description = "Notification and Alert Service for SwiftDrop"))
public class OpenApiConfig {
}
