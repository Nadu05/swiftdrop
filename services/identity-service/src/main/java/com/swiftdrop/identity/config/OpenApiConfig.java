package com.swiftdrop.identity.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "SwiftDrop Identity Service API",
                version = "1.0.0",
                description = "User accounts, authentication, roles, and permissions"
        )
)
public class OpenApiConfig {
}
