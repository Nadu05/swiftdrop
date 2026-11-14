package com.swiftdrop.dispatch.client;

import com.swiftdrop.dispatch.dto.OrderDetailsDto;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.exception.ServiceUnavailableException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * HTTP client for communicating with the internal Order Service.
 * Retrieves orders that are ready for courier dispatch and verifies order eligibility.
 */
@Component
public class OrderServiceClient {

    private final RestClient restClient;
    private final String readyPath;
    private final boolean verifyOnAssignment;

    @Autowired
    public OrderServiceClient(
            @Value("${services.order.base-url:http://localhost:8083}") String baseUrl,
            @Value("${services.order.ready-for-dispatch-path:/api/v1/orders/ready-for-dispatch}") String readyPath,
            @Value("${services.order.connect-timeout:3000}") int connectTimeout,
            @Value("${services.order.read-timeout:5000}") int readTimeout,
            @Value("${services.order.verify-on-assignment:false}") boolean verifyOnAssignment) {
        this.readyPath = readyPath;
        this.verifyOnAssignment = verifyOnAssignment;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeout));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeout));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    /**
     * Testing constructor allowing injection of a customized RestClient.
     */
    public OrderServiceClient(RestClient restClient, String readyPath) {
        this(restClient, readyPath, false);
    }

    public OrderServiceClient(RestClient restClient, String readyPath, boolean verifyOnAssignment) {
        this.restClient = restClient;
        this.readyPath = readyPath;
        this.verifyOnAssignment = verifyOnAssignment;
    }

    /**
     * Retrieve orders ready for courier dispatch from Order Service.
     *
     * @param branchId optional branch filter
     * @param limit maximum candidate orders to return (default 50)
     * @return list of orders eligible for dispatch
     * @throws ServiceUnavailableException when Order Service is unreachable or returns a server error
     */
    public List<OrderDetailsDto> getReadyForDispatchOrders(Long branchId, Integer limit) {
        try {
            List<OrderDetailsDto> response = restClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path(readyPath);
                        if (branchId != null) {
                            uriBuilder.queryParam("branchId", branchId);
                        }
                        if (limit != null) {
                            uriBuilder.queryParam("limit", limit);
                        }
                        return uriBuilder.build();
                    })
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<OrderDetailsDto>>() {});

            return response != null ? response : Collections.emptyList();
        } catch (ResourceAccessException ex) {
            throw new ServiceUnavailableException("Order Service is unavailable or timed out: " + ex.getMessage(), ex);
        } catch (HttpStatusCodeException ex) {
            throw new ServiceUnavailableException("Order Service returned an error [" + ex.getStatusCode() + "]: " + ex.getMessage(), ex);
        } catch (RestClientException ex) {
            throw new ServiceUnavailableException("Failed to retrieve ready-for-dispatch orders from Order Service: " + ex.getMessage(), ex);
        }
    }

    /**
     * Verify whether an order is eligible for dispatch by consulting Order Service.
     *
     * @param orderId the order ID
     * @throws ResourceNotFoundException if order does not exist in Order Service
     * @throws ServiceUnavailableException when Order Service is unreachable or times out
     */
    public void verifyOrderEligibleForDispatch(Long orderId) {
        if (!verifyOnAssignment) {
            return;
        }
        try {
            restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/api/v1/orders/{id}").build(orderId))
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .toBodilessEntity();
        } catch (ResourceAccessException ex) {
            throw new ServiceUnavailableException("Order Service is unavailable or timed out: " + ex.getMessage(), ex);
        } catch (HttpStatusCodeException ex) {
            if (ex.getStatusCode().value() == 404) {
                throw new ResourceNotFoundException("Order", orderId);
            }
            throw new ServiceUnavailableException("Order Service returned an error [" + ex.getStatusCode() + "]: " + ex.getMessage(), ex);
        } catch (RestClientException ex) {
            throw new ServiceUnavailableException("Failed to verify order with Order Service: " + ex.getMessage(), ex);
        }
    }
}
