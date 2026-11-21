package com.swiftdrop.order.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.config.CorrelationIdHolder;
import com.swiftdrop.order.dto.RouteBranchResolutionDto;
import com.swiftdrop.order.exception.ExternalServiceUnavailableException;
import com.swiftdrop.order.exception.InvalidBranchCoverageException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

@Component
public class RestOrganizationServiceClient implements OrganizationServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RestOrganizationServiceClient.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public RestOrganizationServiceClient(
            @Value("${swiftdrop.organization-service.base-url:http://localhost:8082}") String baseUrl,
            ObjectMapper objectMapper) {
        this(RestClient.builder(), baseUrl, objectMapper);
    }

    public RestOrganizationServiceClient(
            RestClient.Builder builder,
            String baseUrl,
            ObjectMapper objectMapper) {
        this.restClient = builder.baseUrl(baseUrl).build();
        this.objectMapper = objectMapper;
    }

    @Override
    public RouteBranchResolutionDto resolveRoute(
            String pickupPostalCode,
            String dropoffPostalCode) {

        Map<String, Object> payload = Map.of(
                "pickupPostalCode", pickupPostalCode != null ? pickupPostalCode.trim() : "",
                "dropoffPostalCode", dropoffPostalCode != null ? dropoffPostalCode.trim() : ""
        );

        try {
            RouteBranchResolutionDto response = restClient.post()
                    .uri("/api/v1/branches/resolve-route")
                    .header(CorrelationIdHolder.HEADER_NAME, CorrelationIdHolder.currentOrNew())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(RouteBranchResolutionDto.class);

            if (response == null || response.getOriginBranch() == null || response.getDestinationBranch() == null) {
                throw new ExternalServiceUnavailableException(
                        "Organization Service returned an incomplete branch resolution response");
            }
            if (!response.getOriginBranch().isEligible()) {
                throw new InvalidBranchCoverageException(
                        "Origin branch is not eligible to accept orders for the specified pickup postal code",
                        "PICKUP"
                );
            }
            if (!response.getDestinationBranch().isEligible()) {
                throw new InvalidBranchCoverageException(
                        "Destination branch is not eligible to accept orders for the specified destination postal code",
                        "DESTINATION"
                );
            }
            return response;

        } catch (HttpClientErrorException.UnprocessableEntity ex) {
            String message = "The requested postal code is outside active branch coverage";
            String locationType = "PICKUP";
            try {
                JsonNode node = objectMapper.readTree(ex.getResponseBodyAsString());
                if (node.hasNonNull("message")) {
                    message = node.get("message").asText();
                }
                if (node.hasNonNull("locationType")) {
                    locationType = node.get("locationType").asText();
                }
            } catch (Exception ignored) {
                // Keep default
            }
            throw new InvalidBranchCoverageException(message, locationType);

        } catch (HttpClientErrorException.BadRequest ex) {
            throw new IllegalArgumentException("Invalid postal codes supplied for branch resolution: " + ex.getMessage());

        } catch (ResourceAccessException | RestClientResponseException ex) {
            log.error("Organization Service branch resolution request failed: {}", ex.getMessage());
            throw new ExternalServiceUnavailableException(
                    "Unable to verify branch coverage with Organization Service. Please try again shortly.",
                    ex
            );
        }
    }
}
