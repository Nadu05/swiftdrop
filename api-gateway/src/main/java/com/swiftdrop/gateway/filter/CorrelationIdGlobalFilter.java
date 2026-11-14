package com.swiftdrop.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class CorrelationIdGlobalFilter implements GlobalFilter, Ordered {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    private static final Logger log = LoggerFactory.getLogger(CorrelationIdGlobalFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String incoming = exchange.getRequest().getHeaders().getFirst(CORRELATION_ID_HEADER);
        String correlationId = StringUtils.hasText(incoming) ? incoming.trim() : UUID.randomUUID().toString();

        ServerHttpRequest mutatedRequest = exchange.getRequest()
                .mutate()
                .headers(headers -> headers.set(CORRELATION_ID_HEADER, correlationId))
                .build();

        exchange.getResponse().getHeaders().set(CORRELATION_ID_HEADER, correlationId);
        log.debug("[correlationId={}] Routing {} {}", correlationId,
                mutatedRequest.getMethod(), mutatedRequest.getURI().getRawPath());

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}

