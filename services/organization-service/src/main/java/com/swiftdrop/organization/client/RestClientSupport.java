package com.swiftdrop.organization.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Shared helper for forwarding caller JWT authentication and parsing upstream error payloads.
 */
final class RestClientSupport {

    private static final String ACCESS_TOKEN_COOKIE = "sd_access_token";
    private static final String BEARER_PREFIX = "Bearer ";

    private RestClientSupport() {
    }

    static void applyCallerAuth(RestClient.RequestHeadersSpec<?> spec) {
        String token = resolveCallerToken();
        if (StringUtils.hasText(token)) {
            spec.header(HttpHeaders.AUTHORIZATION, BEARER_PREFIX + token);
        }
    }

    static String resolveCallerToken() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) {
            return null;
        }
        HttpServletRequest request = attrs.getRequest();
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (ACCESS_TOKEN_COOKIE.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                    return cookie.getValue();
                }
            }
        }
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authHeader) && authHeader.startsWith(BEARER_PREFIX)) {
            String token = authHeader.substring(BEARER_PREFIX.length()).trim();
            return StringUtils.hasText(token) ? token : null;
        }
        return null;
    }

    static String extractErrorMessage(ObjectMapper objectMapper, String responseBody, String fallback) {
        if (!StringUtils.hasText(responseBody)) {
            return fallback;
        }
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            if (node.hasNonNull("message") && StringUtils.hasText(node.get("message").asText())) {
                return node.get("message").asText();
            }
        } catch (Exception ignored) {
            // Keep fallback message
        }
        return fallback;
    }
}
