package com.swiftdrop.organization.client;

import com.swiftdrop.organization.config.CorrelationIdHolder;
import com.swiftdrop.organization.exception.ExternalServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.Map;

@Component
public class RestNotificationServiceClient implements NotificationServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RestNotificationServiceClient.class);

    private final RestClient restClient;

    @Autowired
    public RestNotificationServiceClient(
            @Value("${swiftdrop.notification-service.base-url:http://localhost:8085}") String baseUrl) {
        this(defaultBuilder(), baseUrl);
    }

    public RestNotificationServiceClient(RestClient.Builder builder, String baseUrl) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    private static RestClient.Builder defaultBuilder() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder().requestFactory(requestFactory);
    }

    @Override
    public NotificationBranchCredentialsResultDto sendBranchCredentials(
            String recipientEmail,
            String branchName,
            String branchCode,
            String loginEmail,
            String temporaryPassword) {

        Map<String, Object> payload = Map.of(
                "recipientEmail", recipientEmail,
                "branchName", branchName,
                "branchCode", branchCode,
                "loginEmail", loginEmail,
                "temporaryPassword", temporaryPassword
        );

        try {
            RestClient.RequestBodySpec request = restClient.post()
                    .uri("/api/v1/notifications/branch-credentials")
                    .header(CorrelationIdHolder.HEADER_NAME, CorrelationIdHolder.currentOrNew())
                    .contentType(MediaType.APPLICATION_JSON);
            RestClientSupport.applyCallerAuth(request);

            NotificationBranchCredentialsResultDto response = request
                    .body(payload)
                    .retrieve()
                    .body(NotificationBranchCredentialsResultDto.class);

            if (response == null) {
                throw new ExternalServiceException("Notification Service returned an empty response");
            }
            return response;

        } catch (ResourceAccessException | RestClientResponseException ex) {
            log.warn("Notification Service branch credential email failed for branchCode={}: {}", branchCode, ex.getMessage());
            throw new ExternalServiceException(
                    "Notification service unavailable. Unable to send Branch Manager credential email.",
                    ex
            );
        }
    }
}
