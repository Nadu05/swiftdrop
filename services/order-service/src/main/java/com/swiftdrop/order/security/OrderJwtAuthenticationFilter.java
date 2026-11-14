package com.swiftdrop.order.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
public class OrderJwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String ACCESS_TOKEN_COOKIE = "sd_access_token";

    private final OrderJwtService jwtService;

    public OrderJwtAuthenticationFilter(OrderJwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        try {
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                String token = resolveToken(request);
                if (token != null && jwtService.validateToken(token)) {
                    OrderUserPrincipal principal = jwtService.parsePrincipal(token);
                    setAuthentication(principal, request);
                } else {
                    String headerUserId = request.getHeader("X-User-Id");
                    if (StringUtils.hasText(headerUserId)) {
                        String headerEmail = request.getHeader("X-User-Email");
                        String headerOrgId = request.getHeader("X-Organization-Id");
                        String headerRoles = request.getHeader("X-User-Roles");
                        List<String> roles = StringUtils.hasText(headerRoles)
                                ? Arrays.stream(headerRoles.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()
                                : List.of("CUSTOMER");
                        OrderUserPrincipal principal = new OrderUserPrincipal(
                                headerUserId.trim(),
                                StringUtils.hasText(headerEmail) ? headerEmail.trim() : headerUserId.trim(),
                                StringUtils.hasText(headerOrgId) ? headerOrgId.trim() : null,
                                roles
                        );
                        setAuthentication(principal, request);
                    }
                }
            }
        } catch (Exception ignored) {
            // Leave unauthenticated
        }

        filterChain.doFilter(request, response);
    }

    private void setAuthentication(OrderUserPrincipal principal, HttpServletRequest request) {
        List<SimpleGrantedAuthority> authorities = principal.roles().stream()
                .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                .map(SimpleGrantedAuthority::new)
                .toList();

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, authorities);
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private String resolveToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (ACCESS_TOKEN_COOKIE.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                    return cookie.getValue();
                }
            }
        }
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}

