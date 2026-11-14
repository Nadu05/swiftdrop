package com.swiftdrop.dispatch.config;

import org.slf4j.MDC;

import java.util.UUID;

public final class CorrelationIdHolder {

    public static final String HEADER_NAME = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    private CorrelationIdHolder() {
    }

    public static String currentOrNew() {
        String existing = MDC.get(MDC_KEY);
        return (existing != null && !existing.isBlank()) ? existing : UUID.randomUUID().toString();
    }

    public static String currentOrNull() {
        String existing = MDC.get(MDC_KEY);
        return (existing != null && !existing.isBlank()) ? existing : null;
    }
}

