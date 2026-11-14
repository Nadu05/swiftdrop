package com.swiftdrop.order.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.security.JwtRoleConverter;
import com.swiftdrop.order.security.RestSecurityErrorHandler;
import com.swiftdrop.order.security.ServiceKeyAuthenticationFilter;
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
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;

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
                        // Public tracking exposes only safe data (see PublicTrackingResponse).
                        .requestMatchers(HttpMethod.GET, "/tracking/**", "/api/v1/tracking/**",
                                "/orders/tracking/**", "/api/v1/orders/tracking/**").permitAll()
                        // Delivery status changes are for couriers/staff, never for customers. Must stay above
                        // the CUSTOMER rule below. With no configured role nobody can change a status.
                        .requestMatchers(HttpMethod.PATCH, "/*/status", "/orders/*/status", "/api/v1/orders/*/status")
                                .hasAnyRole(properties.statusUpdateRoles().toArray(String[]::new))
                        // Orders waiting for a courier include recipient contact details: dispatch/staff roles, or
                        // the Dispatch service itself with the shared service key (ServiceKeyAuthenticationFilter).
                        .requestMatchers(HttpMethod.GET, "/ready-for-dispatch", "/orders/ready-for-dispatch",
                                "/api/v1/orders/ready-for-dispatch")
                                .hasAnyAuthority(dispatchAuthorities(properties))
                        // Customer endpoints. The first group is what the gateway forwards after stripping
                        // /api/v1/orders (POST / , GET /cities, /quote, /{id}, /{id}/timeline, /{id}/receipt); they
                        // must be listed here, otherwise "anyRequest().authenticated()" would let ANY logged-in
                        // role (for example a courier) use them.
                        .requestMatchers("/", "/cities", "/quote", "/*", "/*/timeline", "/*/receipt").hasRole("CUSTOMER")
                        .requestMatchers("/orders/**", "/api/v1/orders/**").hasRole("CUSTOMER")
                        .anyRequest().authenticated())
                .addFilterBefore(new ServiceKeyAuthenticationFilter(properties.serviceApiKey()),
                        BearerTokenAuthenticationFilter.class)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(errorHandler)
                        .accessDeniedHandler(errorHandler))
                .oauth2ResourceServer(o -> o
                        .bearerTokenResolver(publicTrackingAwareTokenResolver())
                        .authenticationEntryPoint(errorHandler)
                        .accessDeniedHandler(errorHandler)
                        .jwt(j -> j.jwtAuthenticationConverter(converter)));
        return http.build();
    }

    /** The ready-for-dispatch roles as authorities (ROLE_ prefix), plus the service-key authority. */
    private static String[] dispatchAuthorities(SecurityProperties properties) {
        return Stream.concat(
                        properties.dispatchReadRoles().stream().map(role -> "ROLE_" + role),
                        Stream.of(ServiceKeyAuthenticationFilter.AUTHORITY))
                .toArray(String[]::new);
    }

    /**
     * Public tracking must work for anyone. Without this, a logged-in browser that still sends an expired or
     * invalid {@code Authorization} header would be answered 401 by the JWT filter even though the endpoint is
     * open. On the tracking paths the header is simply not looked at.
     */
    private static BearerTokenResolver publicTrackingAwareTokenResolver() {
        DefaultBearerTokenResolver defaultResolver = new DefaultBearerTokenResolver();
        RequestMatcher publicTracking = new OrRequestMatcher(
                new AntPathRequestMatcher("/tracking/**", "GET"),
                new AntPathRequestMatcher("/api/v1/tracking/**", "GET"),
                new AntPathRequestMatcher("/orders/tracking/**", "GET"),
                new AntPathRequestMatcher("/api/v1/orders/tracking/**", "GET"));
        return request -> publicTracking.matches(request) ? null : defaultResolver.resolve(request);
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
