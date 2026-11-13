package com.swiftdrop.order.security;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Decides which customer a request acts for.
 *
 * <p>With authentication enabled (the default) the id comes only from the verified JWT and the
 * {@code X-Customer-Id} header is ignored. With {@code swiftdrop.security.enabled=false} (testing only) the
 * header is used when present, otherwise the configured default customer id.
 */
@Component
public class CustomerIdResolver {

    private final SecurityProperties properties;

    public CustomerIdResolver(SecurityProperties properties) {
        this.properties = properties;
    }

    public long resolve(Jwt jwt, String customerIdHeader) {
        if (properties.enabled()) {
            return AuthenticatedUser.requireUserId(jwt);
        }
        if (customerIdHeader != null && !customerIdHeader.isBlank()) {
            return Long.parseLong(customerIdHeader);
        }
        return properties.devCustomerId();
    }
}
