package com.swiftdrop.dispatch.client;

import com.swiftdrop.dispatch.exception.ExternalServiceUnavailableException;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.security.DispatchJwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class RestOrderServiceClient implements OrderServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RestOrderServiceClient.class);

    private final RestClient restClient;
    private final DispatchJwtService jwtService;

    @Autowired
    public RestOrderServiceClient(
            @Value("${swiftdrop.order-service.base-url:http://localhost:8083}") String baseUrl,
            DispatchJwtService jwtService) {
        this(RestClient.builder().baseUrl(baseUrl).build(), jwtService);
    }

    public RestOrderServiceClient(RestClient restClient, DispatchJwtService jwtService) {
        this.restClient = restClient;
        this.jwtService = jwtService;
    }

    @Override
    public OrderSummaryDto getOrderByIdOrTracking(String orderIdOrTracking) {
        String token = jwtService.generateInternalServiceToken("dispatch-service", "ADMIN");
        try {
            OrderSummaryDto dto = restClient.get()
                    .uri("/api/v1/orders/{id}", orderIdOrTracking)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(OrderSummaryDto.class);

            if (dto == null) {
                throw new ResourceNotFoundException("Order not found in Order Service: " + orderIdOrTracking);
            }
            return dto;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResourceNotFoundException("Order not found in Order Service: " + orderIdOrTracking);
        } catch (ResourceNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to fetch order {} from Order Service: {}", orderIdOrTracking, ex.getMessage());
            throw new ExternalServiceUnavailableException(
                    "Unable to communicate with Order Service for order " + orderIdOrTracking + ": " + ex.getMessage(),
                    ex
            );
        }
    }

    @Override
    public void notifyStatusTransition(
            String orderIdOrTracking,
            OrderStatusTransitionPayload payload,
            String actorId,
            String actorRole) {
        String token = jwtService.generateInternalServiceToken(actorId, actorRole);
        try {
            restClient.patch()
                    .uri("/api/v1/orders/{id}/status", orderIdOrTracking)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Notified Order Service of status transition -> {} for order {}",
                    payload.getStatus(), orderIdOrTracking);
        } catch (Exception ex) {
            log.warn("Could not synchronize status transition {} to Order Service for order {}: {}",
                    payload.getStatus(), orderIdOrTracking, ex.getMessage());
        }
    }

    @Override
    public void notifyBranchDropoff(
            String orderIdOrTracking,
            String notes,
            String actorId,
            String actorRole) {
        String token = jwtService.generateInternalServiceToken(actorId, actorRole);
        try {
            restClient.post()
                    .uri("/api/v1/orders/{id}/branch-dropoff", orderIdOrTracking)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("notes", notes != null ? notes : "Confirmed branch drop-off receipt"))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Notified Order Service of branch drop-off for order {}", orderIdOrTracking);
        } catch (Exception ex) {
            log.warn("Could not synchronize branch drop-off to Order Service for order {}: {}",
                    orderIdOrTracking, ex.getMessage());
        }
    }
}
