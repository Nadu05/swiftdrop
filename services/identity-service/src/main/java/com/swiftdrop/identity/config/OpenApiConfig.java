package com.swiftdrop.identity.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "SwiftDrop Identity Service API",
                version = "1.0.0",
                description = "User accounts, authentication, roles, and permissions"
        )
)
@SecurityScheme(
        name = "cookieAuth",
        type = SecuritySchemeType.APIKEY,
        in   = SecuritySchemeIn.COOKIE,
        paramName = "sd_access_token"
)
public class OpenApiConfig {
}
