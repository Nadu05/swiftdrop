package com.swiftdrop.identity.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

@Component
public class RestNotificationServiceClient implements NotificationServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RestNotificationServiceClient.class);

    private final RestClient restClient;

    @Autowired
    public RestNotificationServiceClient(
            @Value("${swiftdrop.notification-service.base-url:http://localhost:8085}") String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl)
                .build();
    }

    public RestNotificationServiceClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public void sendPasswordReset(String recipientEmail, String resetToken, String resetUrl) {
        try {
            Map<String, Object> payload = Map.of(
                    "recipientEmail", recipientEmail,
                    "resetToken", resetToken,
                    "resetUrl", resetUrl != null ? resetUrl : ""
            );
            restClient.post()
                    .uri("/api/v1/notifications/password-reset")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Direct REST password reset email notification dispatched to {} via Notification Service", recipientEmail);
        } catch (Exception ex) {
            log.warn("Failed to dispatch password reset notification via direct REST to Notification Service: {}", ex.getMessage());
        }
    }
}
