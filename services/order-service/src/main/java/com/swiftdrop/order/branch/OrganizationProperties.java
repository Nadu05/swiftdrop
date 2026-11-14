package com.swiftdrop.order.branch;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * How this service reaches the Organization service ({@code swiftdrop.organization.*}).
 *
 * @param branchResolutionEnabled when false no call is made and orders are stored without a branch
 *                                (local work without the Organization service; never for production)
 * @param baseUrl                 address of the Organization service, without a trailing path
 * @param connectTimeoutMs        time allowed to connect
 * @param readTimeoutMs           time allowed to wait for the answer
 */
@ConfigurationProperties(prefix = "swiftdrop.organization")
public record OrganizationProperties(
        @DefaultValue("true") boolean branchResolutionEnabled,
        @DefaultValue("http://localhost:8082") String baseUrl,
        @DefaultValue("2000") int connectTimeoutMs,
        @DefaultValue("5000") int readTimeoutMs
) {

    public OrganizationProperties {
        if (branchResolutionEnabled && (baseUrl == null || baseUrl.isBlank())) {
            throw new IllegalArgumentException(
                    "swiftdrop.organization.base-url is required when branch resolution is enabled");
        }
        if (connectTimeoutMs <= 0 || readTimeoutMs <= 0) {
            throw new IllegalArgumentException("swiftdrop.organization timeouts must be greater than 0");
        }
    }
}
