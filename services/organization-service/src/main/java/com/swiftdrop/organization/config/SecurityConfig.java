package com.swiftdrop.organization.config;

import com.swiftdrop.organization.security.OrganizationJwtAuthenticationFilter;
import com.swiftdrop.organization.security.OrganizationJwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.time.LocalDateTime;

/**
 * Spring Security configuration for Organization Service.
 * Enforces stateless JWT authentication and strict role-based access control.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final OrganizationJwtService jwtService;

    public SecurityConfig(OrganizationJwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Bean
    public OrganizationJwtAuthenticationFilter organizationJwtAuthenticationFilter() {
        return new OrganizationJwtAuthenticationFilter(jwtService);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write(String.format(
                                    "{\"timestamp\":\"%s\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Authentication is required to access this endpoint\"}",
                                    LocalDateTime.now()
                            ));
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write(String.format(
                                    "{\"timestamp\":\"%s\",\"status\":403,\"error\":\"Forbidden\",\"message\":\"Insufficient permissions for this organization operation\"}",
                                    LocalDateTime.now()
                            ));
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Public health & OpenAPI docs
                        .requestMatchers(
                                "/health",
                                "/actuator/health",
                                "/actuator/info",
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/api-docs",
                                "/api-docs/**",
                                "/v3/api-docs/**"
                        ).permitAll()
                        // Public coordinate & route resolution (used for pre-booking delivery quotes)
                        .requestMatchers(HttpMethod.POST,
                                "/branches/resolve",
                                "/branches/resolve-route",
                                "/api/v1/branches/resolve",
                                "/api/v1/branches/resolve-route"
                        ).permitAll()
                        // Public read-only branch and service-area lookup
                        .requestMatchers(HttpMethod.GET,
                                "/branches",
                                "/branches/*",
                                "/branches/*/service-areas",
                                "/api/v1/branches",
                                "/api/v1/branches/*",
                                "/api/v1/branches/*/service-areas",
                                "/service-areas",
                                "/service-areas/*",
                                "/api/v1/service-areas",
                                "/api/v1/service-areas/*",
                                "/locations/**",
                                "/api/v1/locations/**"
                        ).permitAll()
                        // Branch creation: Head Office Admin only
                        .requestMatchers(HttpMethod.POST, "/branches", "/api/v1/branches")
                        .hasAnyRole("ADMIN", "HEAD_OFFICE_ADMIN")
                        // Branch updates: Head Office Admin or Branch Manager (branch ownership verified in controller/service)
                        .requestMatchers(HttpMethod.PATCH, "/branches/*", "/api/v1/branches/*")
                        .hasAnyRole("ADMIN", "HEAD_OFFICE_ADMIN", "BRANCH_MANAGER")
                        // Service area mutations: Head Office Admin only
                        .requestMatchers(HttpMethod.POST, "/service-areas", "/api/v1/service-areas")
                        .hasAnyRole("ADMIN", "HEAD_OFFICE_ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/service-areas/*", "/api/v1/service-areas/*")
                        .hasAnyRole("ADMIN", "HEAD_OFFICE_ADMIN")
                        // Merchant approval / rejection: Head Office Admin only
                        .requestMatchers(HttpMethod.POST,
                                "/merchants/applications/*/approve",
                                "/merchants/applications/*/reject",
                                "/api/v1/merchants/applications/*/approve",
                                "/api/v1/merchants/applications/*/reject"
                        ).hasAnyRole("ADMIN", "HEAD_OFFICE_ADMIN")
                        // Merchant administrative listing & metrics: Head Office Admin or internal S2S
                        .requestMatchers(HttpMethod.GET,
                                "/merchants/applications",
                                "/merchants/applications/summary",
                                "/merchants/applications/approved",
                                "/api/v1/merchants/applications",
                                "/api/v1/merchants/applications/summary",
                                "/api/v1/merchants/applications/approved"
                        ).hasAnyRole("ADMIN", "HEAD_OFFICE_ADMIN", "INTERNAL_SERVICE")
                        // All other endpoints (e.g. submitting merchant application, /my, /{id}) require authentication
                        .anyRequest().authenticated()
                )
                .addFilterBefore(organizationJwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
