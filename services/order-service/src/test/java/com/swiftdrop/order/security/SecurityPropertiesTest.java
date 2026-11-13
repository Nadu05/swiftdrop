package com.swiftdrop.order.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityPropertiesTest {

    private static SecurityProperties with(List<String> status, List<String> dispatch, String serviceKey) {
        return new SecurityProperties(true, 1, "secret", "role", status, dispatch, serviceKey);
    }

    @Test
    @DisplayName("role lists are trimmed and upper-cased, and CUSTOMER can never be in a staff list")
    void rolesAreNormalised() {
        SecurityProperties p = with(List.of(" courier ", "customer", "", "Admin"), List.of("CUSTOMER", "dispatcher"), null);

        assertThat(p.statusUpdateRoles()).containsExactly("COURIER", "ADMIN");
        assertThat(p.dispatchReadRoles()).containsExactly("DISPATCHER");
    }

    @Test
    @DisplayName("no role list means nobody is allowed")
    void nullRoles() {
        SecurityProperties p = with(null, null, null);

        assertThat(p.statusUpdateRoles()).isEmpty();
        assertThat(p.dispatchReadRoles()).isEmpty();
    }

    @Test
    @DisplayName("the service key is optional: null or blank switches it off")
    void serviceKeyOptional() {
        assertThat(with(List.of(), List.of(), null).serviceApiKey()).isNull();
        assertThat(with(List.of(), List.of(), "").serviceApiKey()).isEmpty();
        assertThat(with(List.of(), List.of(), "   ").serviceApiKey()).isBlank();
    }

    @Test
    @DisplayName("a short service key stops the service at startup, and the message does not reveal the key")
    void shortServiceKeyRejected() {
        assertThatThrownBy(() -> with(List.of(), List.of(), "too-short-key"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least 32")
                .hasMessageNotContaining("too-short-key");
    }

    @Test
    @DisplayName("a long enough service key is accepted")
    void longServiceKeyAccepted() {
        String key = "k".repeat(SecurityProperties.MIN_SERVICE_KEY_LENGTH);

        assertThat(with(List.of(), List.of(), key).serviceApiKey()).isEqualTo(key);
    }
}
