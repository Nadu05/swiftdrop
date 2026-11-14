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

@Component
public class DispatchJwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(DispatchJwtAuthenticationFilter.class);

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
        Long branchOverride = resolveBranchHeader(request);

        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                DispatchUserPrincipal principal = jwtService.extractPrincipal(token, branchOverride);
                List<SimpleGrantedAuthority> authorities = principal.roles().stream()
                        .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r.toUpperCase())
                        .map(SimpleGrantedAuthority::new)
                        .toList();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (Exception ex) {
                log.debug("Invalid or expired JWT token on request {}: {}", request.getRequestURI(), ex.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName()) || "jwt".equals(cookie.getName())) {
                    String val = cookie.getValue();
                    if (val != null && !val.isBlank()) {
                        return val.trim();
                    }
                }
            }
        }
        return null;
    }

    private Long resolveBranchHeader(HttpServletRequest request) {
        String branchHeader = request.getHeader("X-Branch-Id");
        if (branchHeader != null && !branchHeader.isBlank()) {
            try {
                return Long.parseLong(branchHeader.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }
}
