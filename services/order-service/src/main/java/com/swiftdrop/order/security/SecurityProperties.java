package com.swiftdrop.order.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.List;
import java.util.Locale;

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
 * @param statusUpdateRoles roles allowed to change an order's delivery status (couriers and staff). Placeholder
 *                       names until the Identity service fixes the role list; {@code CUSTOMER} is never accepted
 * @param dispatchReadRoles roles allowed to list orders that are ready for dispatch (dispatchers and staff). The
 *                       response contains recipient contact details. Placeholder names; {@code CUSTOMER} is never
 *                       accepted
 * @param serviceApiKey  shared secret the Dispatch service sends in the X-Service-Key header to read the ready-for-dispatch
 *                       list without a user token. Blank (the default) switches this off; when set it must be at least
 *                       32 characters. Only that one endpoint accepts it
 */
@ConfigurationProperties(prefix = "swiftdrop.security")
public record SecurityProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("1") long devCustomerId,
        String jwtSecret,
        @DefaultValue("role") String roleClaim,
        @DefaultValue({"COURIER", "BRANCH_ADMIN", "ADMIN"}) List<String> statusUpdateRoles,
        @DefaultValue({"DISPATCHER", "BRANCH_ADMIN", "ADMIN"}) List<String> dispatchReadRoles,
        String serviceApiKey
) {
    public static final int MIN_SERVICE_KEY_LENGTH = 32;

    public SecurityProperties {
        statusUpdateRoles = staffRoles(statusUpdateRoles);
        dispatchReadRoles = staffRoles(dispatchReadRoles);
        if (serviceApiKey != null && !serviceApiKey.isBlank() && serviceApiKey.length() < MIN_SERVICE_KEY_LENGTH) {
            throw new IllegalArgumentException("swiftdrop.security.service-api-key must be at least "
                    + MIN_SERVICE_KEY_LENGTH + " characters (or left empty to disable it)");
        }
    }

    /** Upper-cases, drops blanks, and never lets CUSTOMER into a staff-only list. */
    private static List<String> staffRoles(List<String> roles) {
        return roles == null ? List.of()
                : roles.stream()
                        .map(role -> role.trim().toUpperCase(Locale.ROOT))
                        .filter(role -> !role.isEmpty() && !role.equals("CUSTOMER"))
                        .toList();
    }
}
