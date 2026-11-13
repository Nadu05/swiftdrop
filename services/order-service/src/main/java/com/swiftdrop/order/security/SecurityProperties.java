package com.swiftdrop.order.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * JWT settings, bound from {@code swiftdrop.security.*}.
 *
 * <p>Assumed token contract (to be confirmed with the Identity service): HS256 signed with the shared
 * {@code JWT_SECRET} (used as raw UTF-8 bytes), {@code sub} = numeric user id, and a role claim named
 * {@code roleClaim} holding a string or list of strings such as {@code CUSTOMER}.
 *
 * @param enabled        {@code true} (the secure default) requires a valid JWT on order endpoints. {@code false}
 *                       is for TESTING ONLY: no authentication is performed and the customer id comes from
 *                       {@code devCustomerId} or the {@code X-Customer-Id} header
 * @param devCustomerId  customer id used when authentication is disabled and no header is sent
 * @param jwtSecret      the shared signing secret; when blank every token is rejected (fail closed)
 * @param roleClaim      name of the claim that carries the user's role(s)
 */
@ConfigurationProperties(prefix = "swiftdrop.security")
public record SecurityProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("1") long devCustomerId,
        String jwtSecret,
        @DefaultValue("role") String roleClaim
) {
}
