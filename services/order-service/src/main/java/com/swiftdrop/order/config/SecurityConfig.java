package com.swiftdrop.order.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.security.JwtRoleConverter;
import com.swiftdrop.order.security.RestSecurityErrorHandler;
import com.swiftdrop.order.security.SecurityProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/**
 * Stateless JWT resource-server security. Order endpoints require the CUSTOMER role; ownership of an
 * individual order is enforced in the service layer. Public tracking, health checks and API docs are open.
 */
@Configuration
@EnableConfigurationProperties(SecurityProperties.class)
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityProperties properties,
                                                   ObjectMapper objectMapper) throws Exception {
        if (!properties.enabled()) {
            // TESTING ONLY: no authentication. Set swiftdrop.security.enabled=true to restore JWT protection.
            log.warn("Authentication is DISABLED (swiftdrop.security.enabled=false): every endpoint is open and "
                    + "orders are created for customer {} unless an X-Customer-Id header is sent.",
                    properties.devCustomerId());
            http
                    .csrf(AbstractHttpConfigurer::disable)
                    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                    .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }

        RestSecurityErrorHandler errorHandler = new RestSecurityErrorHandler(objectMapper);

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new JwtRoleConverter(properties.roleClaim()));

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/health", "/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").permitAll()
                        // Temporary infrastructure-test scaffolding; remove together with TestItem.
                        .requestMatchers("/test-items/**", "/api/v1/test-items/**").permitAll()
                        // Public tracking (added with the tracking-timeline work) exposes only safe data.
                        .requestMatchers(HttpMethod.GET, "/orders/tracking/**", "/api/v1/orders/tracking/**").permitAll()
                        .requestMatchers("/orders/**", "/api/v1/orders/**").hasRole("CUSTOMER")
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(errorHandler)
                        .accessDeniedHandler(errorHandler))
                .oauth2ResourceServer(o -> o
                        .authenticationEntryPoint(errorHandler)
                        .accessDeniedHandler(errorHandler)
                        .jwt(j -> j.jwtAuthenticationConverter(converter)));
        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder(SecurityProperties properties) {
        String secret = properties.jwtSecret();
        if (secret == null || secret.isBlank()) {
            if (properties.enabled()) {
                log.warn("JWT_SECRET is not configured: all authenticated endpoints will reject every request.");
            }
            return token -> {
                throw new BadJwtException("JWT verification is not configured");
            };
        }
        SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }
}
