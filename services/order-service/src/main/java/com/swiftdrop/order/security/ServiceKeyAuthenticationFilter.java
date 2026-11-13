package com.swiftdrop.order.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Lets a trusted backend service (the Dispatch service) call {@code GET /orders/ready-for-dispatch} with a shared
 * secret in the {@value #HEADER} header instead of a user JWT, because a service has no user token.
 *
 * <p>This is deliberately narrow:
 * <ul>
 *   <li>it only applies to {@code GET} on the ready-for-dispatch paths; on every other URL the header is ignored,
 *       so the key cannot read customer orders, change statuses or do anything else;</li>
 *   <li>it grants a single authority, {@value #AUTHORITY}, which only that endpoint's rule accepts. A JWT can
 *       never carry it (JWT roles are always turned into {@code ROLE_*} authorities);</li>
 *   <li>with no key configured the feature is off and the header is ignored (fail closed);</li>
 *   <li>the key is compared in constant time and is never logged.</li>
 * </ul>
 * A missing or wrong key simply authenticates nobody, so the normal rules answer (401 without a valid JWT).
 */
public class ServiceKeyAuthenticationFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Service-Key";
    public static final String AUTHORITY = "SERVICE_KEY_DISPATCH";

    private static final RequestMatcher READY_FOR_DISPATCH = new OrRequestMatcher(
            new AntPathRequestMatcher("/orders/ready-for-dispatch", "GET"),
            new AntPathRequestMatcher("/api/v1/orders/ready-for-dispatch", "GET"));

    private final byte[] expectedKey;

    /** @param serviceApiKey the configured secret; null or blank switches the feature off */
    public ServiceKeyAuthenticationFilter(String serviceApiKey) {
        this.expectedKey = serviceApiKey == null || serviceApiKey.isBlank()
                ? null : serviceApiKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String presented = request.getHeader(HEADER);
        if (expectedKey != null && presented != null && READY_FOR_DISPATCH.matches(request)
                && MessageDigest.isEqual(expectedKey, presented.getBytes(StandardCharsets.UTF_8))) {
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    "dispatch-service", null, List.of(new SimpleGrantedAuthority(AUTHORITY))));
        }
        chain.doFilter(request, response);
    }
}
