package com.swiftdrop.identity.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Simple health endpoint for the identity service.
 */
@RestController
public class HealthController {

    @Value("${spring.application.name}")
    private String serviceName;

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "service", serviceName,
                "status", "UP",
                "timestamp", LocalDateTime.now().toString()
        );
    }
}
