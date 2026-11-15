package com.swiftdrop.organization.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Servlet filter that ensures every HTTP request has a correlation ID for distributed tracing
 * and structured logging (agent.backend.md §2.6, §4.1, §6.1, §9).
 *
 * <ul>
 *   <li>Reads {@code X-Correlation-Id} from the incoming request header when present and non-blank;
 *       otherwise generates a new UUID.</li>
 *   <li>Binds the correlation ID in SLF4J {@link MDC} under key {@code correlationId} for the
 *       duration of the request and clears it in a {@code finally} block.</li>
 *   <li>Returns {@code X-Correlation-Id} in the HTTP response headers.</li>
 * </ul>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String HEADER_NAME = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = resolveCorrelationId(request.getHeader(HEADER_NAME));
        MDC.put(MDC_KEY, correlationId);
        response.setHeader(HEADER_NAME, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    /**
     * Returns the correlation ID currently bound in SLF4J {@link MDC}, or generates a new UUID
     * when called outside an HTTP request context (e.g. in unit tests).
     */
    public static String currentOrGenerate() {
        return resolveCorrelationId(MDC.get(MDC_KEY));
    }

    static String resolveCorrelationId(String candidate) {
        if (candidate != null && !candidate.isBlank()) {
            return candidate.trim();
        }
        return UUID.randomUUID().toString();
    }
}

