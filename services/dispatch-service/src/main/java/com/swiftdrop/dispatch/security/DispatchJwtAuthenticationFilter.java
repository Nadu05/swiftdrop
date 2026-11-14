package com.swiftdrop.dispatch.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Stateless JWT authentication filter for Dispatch Service.
 * Extracts and validates JWT tokens from either {@code Authorization: Bearer}
 * or the {@code sd_access_token} HttpOnly cookie. Never trusts client X-Branch-Id headers.
 */
@Component
public class DispatchJwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(DispatchJwtAuthenticationFilter.class);
    private static final String ACCESS_TOKEN_COOKIE = "sd_access_token";

    private final DispatchJwtService jwtService;

    public DispatchJwtAuthenticationFilter(DispatchJwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String token = resolveToken(request);
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                DispatchUserPrincipal principal = jwtService.extractPrincipal(token);
                List<SimpleGrantedAuthority> authorities = principal.roles().stream()
                        .map(r -> r.startsWith("ROLE_") ? r.toUpperCase() : "ROLE_" + r.toUpperCase())
                        .map(SimpleGrantedAuthority::new)
                        .toList();

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        authorities
                );
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ex) {
                log.debug("Invalid JWT token on request {}: {}", request.getRequestURI(), ex.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String bearer = authHeader.substring(7).trim();
            if (!bearer.isEmpty()) {
                return bearer;
            }
        }

        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (ACCESS_TOKEN_COOKIE.equals(cookie.getName())
                        && cookie.getValue() != null
                        && !cookie.getValue().isBlank()) {
                    return cookie.getValue().trim();
                }
            }
        }
        return null;
    }
}
