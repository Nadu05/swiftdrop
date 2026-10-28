package com.swiftdrop.dispatch.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "SwiftDrop Dispatch Service API", version = "1.0", description = "Dispatch and Courier Assignment Service for SwiftDrop"))
public class OpenApiConfig {
}
