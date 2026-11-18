package com.swiftdrop.organization.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.config.CorrelationIdHolder;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.ExternalServiceException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class RestIdentityServiceClient implements IdentityServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RestIdentityServiceClient.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public RestIdentityServiceClient(
            @Value("${swiftdrop.identity-service.base-url:http://localhost:8081}") String baseUrl,
            ObjectMapper objectMapper) {
        this(defaultBuilder(), baseUrl, objectMapper);
    }

    public RestIdentityServiceClient(
            RestClient.Builder builder,
            String baseUrl,
            ObjectMapper objectMapper) {
        this.restClient = builder.baseUrl(baseUrl).build();
        this.objectMapper = objectMapper;
    }

    private static RestClient.Builder defaultBuilder() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder().requestFactory(requestFactory);
    }

    @Override
    public IdentityBranchManagerCredentialsDto provisionBranchManager(
            Long branchId,
            String email,
            String fullName,
            String organizationId) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("branchId", branchId);
        payload.put("email", email);
        payload.put("fullName", fullName);
        if (organizationId != null) {
            payload.put("organizationId", organizationId);
        }

        try {
            RestClient.RequestBodySpec request = restClient.post()
                    .uri("/api/v1/admin/branch-managers/provision")
                    .header(CorrelationIdHolder.HEADER_NAME, CorrelationIdHolder.currentOrNew())
                    .contentType(MediaType.APPLICATION_JSON);
            RestClientSupport.applyCallerAuth(request);

            IdentityBranchManagerCredentialsDto response = request
                    .body(payload)
                    .retrieve()
                    .body(IdentityBranchManagerCredentialsDto.class);

            if (response == null) {
                throw new ExternalServiceException("Identity Service returned an empty provisioning response");
            }
            return response;

        } catch (HttpClientErrorException.Conflict ex) {
            String message = RestClientSupport.extractErrorMessage(
                    objectMapper,
                    ex.getResponseBodyAsString(),
                    "A user or Branch Manager already exists for this email or branch"
            );
            throw new DuplicateResourceException(message);

        } catch (HttpClientErrorException.BadRequest ex) {
            String message = RestClientSupport.extractErrorMessage(
                    objectMapper,
                    ex.getResponseBodyAsString(),
                    "Invalid Branch Manager provisioning request"
            );
            throw new IllegalArgumentException(message);

        } catch (ResourceAccessException | RestClientResponseException ex) {
            log.error("Identity Service branch manager provisioning failed for branchId={}: {}", branchId, ex.getMessage());
            throw new ExternalServiceException(
                    "Unable to provision Branch Manager with Identity Service. Please try again shortly.",
                    ex
            );
        }
    }

    @Override
    public Optional<IdentityBranchManagerCredentialsDto> getBranchManagerCredentials(Long branchId) {
        try {
            RestClient.RequestHeadersSpec<?> request = restClient.get()
                    .uri("/api/v1/admin/branch-managers/{branchId}/credentials", branchId)
                    .header(CorrelationIdHolder.HEADER_NAME, CorrelationIdHolder.currentOrNew());
            RestClientSupport.applyCallerAuth(request);

            IdentityBranchManagerCredentialsDto response = request
                    .retrieve()
                    .body(IdentityBranchManagerCredentialsDto.class);

            return Optional.ofNullable(response);

        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();

        } catch (ResourceAccessException | RestClientResponseException ex) {
            log.error("Identity Service credential lookup failed for branchId={}: {}", branchId, ex.getMessage());
            throw new ExternalServiceException(
                    "Unable to retrieve Branch Manager credentials from Identity Service. Please try again shortly.",
                    ex
            );
        }
    }

    @Override
    public IdentityBranchManagerCredentialsDto resetBranchManagerCredentials(Long branchId) {
        try {
            RestClient.RequestBodySpec request = restClient.post()
                    .uri("/api/v1/admin/branch-managers/{branchId}/credentials/reset", branchId)
                    .header(CorrelationIdHolder.HEADER_NAME, CorrelationIdHolder.currentOrNew());
            RestClientSupport.applyCallerAuth(request);

            IdentityBranchManagerCredentialsDto response = request
                    .retrieve()
                    .body(IdentityBranchManagerCredentialsDto.class);

            if (response == null) {
                throw new ExternalServiceException("Identity Service returned an empty reset response");
            }
            return response;

        } catch (HttpClientErrorException.NotFound ex) {
            String message = RestClientSupport.extractErrorMessage(
                    objectMapper,
                    ex.getResponseBodyAsString(),
                    "No Branch Manager account exists for branch " + branchId
            );
            throw new ResourceNotFoundException(message);

        } catch (ResourceAccessException | RestClientResponseException ex) {
            log.error("Identity Service credential reset failed for branchId={}: {}", branchId, ex.getMessage());
            throw new ExternalServiceException(
                    "Unable to reset Branch Manager credentials with Identity Service. Please try again shortly.",
                    ex
            );
        }
    }
}
