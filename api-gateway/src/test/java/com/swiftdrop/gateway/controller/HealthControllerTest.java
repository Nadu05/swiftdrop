package com.swiftdrop.gateway.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class HealthControllerTest {

    @Test
    @DisplayName("Should return UP status for API Gateway health")
    void shouldReturnHealthStatus() {
        HealthController controller = new HealthController();

        Map<String, Object> response = controller.health().block();

        assertThat(response).isNotNull();
        assertThat(response.get("status")).isEqualTo("UP");
    }
}
