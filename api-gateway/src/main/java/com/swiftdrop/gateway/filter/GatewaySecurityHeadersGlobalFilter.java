package com.swiftdrop.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Strips any client-supplied internal identity, role, organization, or branch headers
 * so external callers cannot spoof authenticated principal attributes downstream.
 */
@Component
public class GatewaySecurityHeadersGlobalFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(GatewaySecurityHeadersGlobalFilter.class);

    public static final List<String> FORBIDDEN_CLIENT_HEADERS = List.of(
            "X-User-Id",
            "X-User-Email",
            "X-User-Roles",
            "X-Organization-Id",
            "X-Branch-Id",
            "X-Internal-Service"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String rawPath = exchange.getRequest().getURI().getRawPath();
        ServerHttpRequest mutatedRequest = exchange.getRequest()
                .mutate()
                .headers(headers -> {
                    for (String forbiddenHeader : FORBIDDEN_CLIENT_HEADERS) {
                        if (headers.remove(forbiddenHeader) != null) {
                            log.debug("Stripped untrusted client header '{}' on request {}", forbiddenHeader, rawPath);
                        }
                    }
                })
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 1;
    }
}
