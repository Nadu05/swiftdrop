package com.swiftdrop.gateway;

import com.swiftdrop.gateway.filter.CorrelationIdGlobalFilter;
import com.swiftdrop.gateway.filter.GatewaySecurityHeadersGlobalFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class GatewayRoutesAndCorrelationTest {

    @Autowired
    private RouteLocator routeLocator;

    @Autowired
    private CorrelationIdGlobalFilter correlationFilter;

    @Autowired
    private GatewaySecurityHeadersGlobalFilter securityHeadersFilter;

    @Test
    void routeLocatorContainsAllCoreMicroserviceRoutes() {
        List<String> routeIds = routeLocator.getRoutes().map(Route::getId).collectList().block();
        assertThat(routeIds).contains(
                "identity-auth",
                "identity-users",
                "identity-admin",
                "organization-service",
                "order-service",
                "order-tracking-public",
                "dispatch-service",
                "notification-service"
        );
    }

    @Test
    void correlationIdGlobalFilterGeneratesAndPropagatesHeaderWhenMissing() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();

        correlationFilter.filter(exchange, ex -> {
            forwarded.set(ex);
            return Mono.empty();
        }).block();

        String downstreamCorrId = forwarded.get().getRequest().getHeaders()
                .getFirst(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER);
        String responseCorrId = exchange.getResponse().getHeaders()
                .getFirst(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER);

        assertThat(downstreamCorrId).isNotBlank();
        assertThat(responseCorrId).isEqualTo(downstreamCorrId);
    }

    @Test
    void correlationIdGlobalFilterPreservesExistingHeader() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/dispatch/transfers/manifests")
                .header(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER, "corr-e2e-9988")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();

        correlationFilter.filter(exchange, ex -> {
            forwarded.set(ex);
            return Mono.empty();
        }).block();

        assertThat(forwarded.get().getRequest().getHeaders()
                .getFirst(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER)).isEqualTo("corr-e2e-9988");
        assertThat(exchange.getResponse().getHeaders()
                .getFirst(CorrelationIdGlobalFilter.CORRELATION_ID_HEADER)).isEqualTo("corr-e2e-9988");
    }

    @Test
    void securityHeadersFilterStripsSpoofedClientIdentityAndBranchHeaders() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .header("X-User-Id", "spoofed-admin")
                .header("X-User-Email", "hacker@swiftdrop.lk")
                .header("X-User-Roles", "ADMIN")
                .header("X-Organization-Id", "org-999")
                .header("X-Branch-Id", "1")
                .header("X-Internal-Service", "true")
                .header("Authorization", "Bearer valid-jwt-token")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();

        securityHeadersFilter.filter(exchange, ex -> {
            forwarded.set(ex);
            return Mono.empty();
        }).block();

        var forwardedHeaders = forwarded.get().getRequest().getHeaders();
        assertThat(forwardedHeaders.containsKey("X-User-Id")).isFalse();
        assertThat(forwardedHeaders.containsKey("X-User-Email")).isFalse();
        assertThat(forwardedHeaders.containsKey("X-User-Roles")).isFalse();
        assertThat(forwardedHeaders.containsKey("X-Organization-Id")).isFalse();
        assertThat(forwardedHeaders.containsKey("X-Branch-Id")).isFalse();
        assertThat(forwardedHeaders.containsKey("X-Internal-Service")).isFalse();
        assertThat(forwardedHeaders.getFirst("Authorization")).isEqualTo("Bearer valid-jwt-token");
    }
}

