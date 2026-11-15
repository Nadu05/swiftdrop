package com.swiftdrop.dispatch.client.courier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.List;

/**
 * Read-only lookup of order details for the courier portal (pickup and drop-off addresses, parcel).
 *
 * <p>Reads Order's {@code GET /orders/ready-for-dispatch}, which includes {@code pickupAddress}/{@code pickupCity}
 * that the dispatcher-side {@code OrderDetailsDto} does not carry. An order stays in that list (status CREATED)
 * until it is picked up, so an assigned job's details can be filled in before the courier needs them.
 *
 * <p>Sends {@code X-Service-Key} when {@code ORDER_SERVICE_API_KEY} is set (required once Order's auth is on).
 * Never throws: on any failure it logs and returns an empty list, so the courier's job list still loads.
 */
@Component
public class CourierOrderLookupClient {

    private static final Logger log = LoggerFactory.getLogger(CourierOrderLookupClient.class);
    static final int LOOKUP_LIMIT = 200;

    private final RestClient restClient;
    private final String readyPath;
    private final String serviceKey;

    @Autowired
    public CourierOrderLookupClient(
            @Value("${services.order.base-url:http://localhost:8083}") String baseUrl,
            @Value("${services.order.ready-for-dispatch-path:/api/v1/orders/ready-for-dispatch}") String readyPath,
            @Value("${services.order.connect-timeout:3000}") int connectTimeout,
            @Value("${services.order.read-timeout:5000}") int readTimeout,
            @Value("${ORDER_SERVICE_API_KEY:}") String serviceKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeout));
        factory.setReadTimeout(Duration.ofMillis(readTimeout));
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.readyPath = readyPath;
        this.serviceKey = serviceKey;
    }

    CourierOrderLookupClient(RestClient restClient, String readyPath, String serviceKey) {
        this.restClient = restClient;
        this.readyPath = readyPath;
        this.serviceKey = serviceKey;
    }

    public List<CourierOrderDetails> findOpenOrders() {
        try {
            List<CourierOrderDetails> orders = restClient.get()
                    .uri(b -> b.path(readyPath).queryParam("limit", LOOKUP_LIMIT).build())
                    .accept(MediaType.APPLICATION_JSON)
                    .headers(h -> {
                        if (serviceKey != null && !serviceKey.isBlank()) {
                            h.set("X-Service-Key", serviceKey);
                        }
                    })
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<CourierOrderDetails>>() {});
            return orders == null ? List.of() : orders;
        } catch (RestClientException ex) {
            log.warn("Could not load order details for the courier portal: {}", ex.getClass().getSimpleName());
            return List.of();
        }
    }
}
