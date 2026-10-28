package com.swiftdrop.order.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "SwiftDrop Order Service API", version = "1.0", description = "Order Management Service for SwiftDrop"))
public class OpenApiConfig {
}
