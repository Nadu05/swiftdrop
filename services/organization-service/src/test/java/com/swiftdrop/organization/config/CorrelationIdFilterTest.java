package com.swiftdrop.organization.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CorrelationIdFilterTest {

    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    @DisplayName("Preserves incoming X-Correlation-Id in MDC and response header, then clears MDC")
    void doFilterInternal_WithIncomingHeader_PropagatesAndClearsMdc() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/merchants");
        request.addHeader(CorrelationIdFilter.HEADER_NAME, "  req-corr-abc-123  ");
        MockHttpServletResponse response = new MockHttpServletResponse();

        AtomicReference<String> mdcInsideFilter = new AtomicReference<>();
        FilterChain filterChain = (req, res) ->
                mdcInsideFilter.set(MDC.get(CorrelationIdFilter.MDC_KEY));

        filter.doFilter(request, response, filterChain);

        assertThat(mdcInsideFilter.get()).isEqualTo("req-corr-abc-123");
        assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME)).isEqualTo("req-corr-abc-123");
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }

    @Test
    @DisplayName("Generates UUID when X-Correlation-Id header is missing or blank, sets response header, and clears MDC")
    void doFilterInternal_WithoutHeader_GeneratesUuidAndClearsMdc() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/merchants");
        request.addHeader(CorrelationIdFilter.HEADER_NAME, "   ");
        MockHttpServletResponse response = new MockHttpServletResponse();

        AtomicReference<String> mdcInsideFilter = new AtomicReference<>();
        FilterChain filterChain = (req, res) ->
                mdcInsideFilter.set(MDC.get(CorrelationIdFilter.MDC_KEY));

        filter.doFilter(request, response, filterChain);

        String generated = response.getHeader(CorrelationIdFilter.HEADER_NAME);
        assertThat(generated).isNotBlank();
        assertThat(mdcInsideFilter.get()).isEqualTo(generated);
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }

    @Test
    @DisplayName("Clears MDC in finally block even if downstream filterChain throws an exception")
    void doFilterInternal_WhenChainThrows_StillClearsMdc() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/merchants/10");
        request.addHeader(CorrelationIdFilter.HEADER_NAME, "corr-err-999");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain failingChain = (req, res) -> {
            assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isEqualTo("corr-err-999");
            throw new ServletException("Downstream failure");
        };

        assertThatThrownBy(() -> filter.doFilter(request, response, failingChain))
                .isInstanceOf(ServletException.class);

        assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME)).isEqualTo("corr-err-999");
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }
}

