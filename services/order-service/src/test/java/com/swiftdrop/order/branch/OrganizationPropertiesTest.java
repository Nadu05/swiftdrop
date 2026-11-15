package com.swiftdrop.order.branch;

import com.swiftdrop.order.config.BranchResolutionConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrganizationPropertiesTest {

    @Test
    @DisplayName("valid settings are accepted")
    void valid() {
        OrganizationProperties properties = new OrganizationProperties(true, "http://localhost:8082", 2000, 5000);

        assertThat(properties.baseUrl()).isEqualTo("http://localhost:8082");
    }

    @Test
    @DisplayName("a missing base URL is refused when branch resolution is on (the app must not start)")
    void missingUrlWhenEnabled() {
        assertThatThrownBy(() -> new OrganizationProperties(true, " ", 2000, 5000))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("base-url");
    }

    @Test
    @DisplayName("a missing base URL is fine when branch resolution is off")
    void missingUrlWhenDisabled() {
        assertThat(new OrganizationProperties(false, null, 2000, 5000).branchResolutionEnabled()).isFalse();
    }

    @Test
    @DisplayName("timeouts must be positive")
    void timeouts() {
        assertThatThrownBy(() -> new OrganizationProperties(true, "http://x", 0, 5000))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OrganizationProperties(true, "http://x", 2000, -1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("switched off, the resolver gives no branch and makes no call")
    void disabledResolverReturnsNothing() {
        BranchResolver resolver = new BranchResolutionConfig()
                .branchResolver(new OrganizationProperties(false, null, 2000, 5000));

        assertThat(resolver.resolve(new com.swiftdrop.order.location.City("COLOMBO", "Colombo", "Colombo", 6.9, 79.8)))
                .isEmpty();
    }

    @Test
    @DisplayName("switched on, the real Organization client is created")
    void enabledResolverIsTheClient() {
        BranchResolver resolver = new BranchResolutionConfig()
                .branchResolver(new OrganizationProperties(true, "http://localhost:8082", 2000, 5000));

        assertThat(resolver).isInstanceOf(OrganizationBranchResolver.class);
    }
}
