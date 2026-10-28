package com.swiftdrop.organization.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "SwiftDrop Organization Service API", version = "1.0.0", description = "Head Office, branches, and organizational hierarchy"))
public class OpenApiConfig {}
