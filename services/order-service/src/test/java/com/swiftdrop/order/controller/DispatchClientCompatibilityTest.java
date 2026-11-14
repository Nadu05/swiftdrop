package com.swiftdrop.order.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.swiftdrop.order.dto.ReadyForDispatchResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Checks the assumption the extra {@code pickupAddress} / {@code pickupCity} fields rely on: a client that is built
 * like Dispatch's ({@code RestClient.builder()}) and reads a DTO without those fields must not fail on them.
 * The DTO below is a copy of the shape of Dispatch's {@code OrderDetailsDto} (only the fields it declares).
 */
class DispatchClientCompatibilityTest {

    /** Same fields and types as dispatch-service's OrderDetailsDto, and nothing else. */
    public static class DispatchOrderDetails {
        public Long id;
        public String orderNumber;
        public String trackingNumber;
        public Long branchId;
        public String recipientName;
        public String recipientPhone;
        public String deliveryAddress;
        public String city;
        public String merchantName;
        public String merchantContact;
        public String priority;
        public String packageType;
        public Double weightKg;
        public String dimensions;
        public String handlingNotes;
        public LocalDateTime createdAt;
    }

    @Test
    @DisplayName("a Dispatch-style client reads our response, ignores the extra pickup fields, and sends the service key")
    void dispatchStyleClientReadsResponse() throws Exception {
        ReadyForDispatchResponse sample = new ReadyForDispatchResponse(7L, "SD-261113-AAAA2222", "SD-261113-AAAA2222",
                3L, "Ayesha Perera", "0718849201", "12/4 Peradeniya Road, Kandy", "Kandy", "Nuwan Pradeep",
                "+94771234567", "STANDARD", "MEDIUM", 1.5, null, "Call on arrival",
                LocalDateTime.of(2026, 11, 13, 8, 30), "45 Galle Road, Colombo 03", "Colombo");
        // Serialised the way the Order service serialises it (ISO strings, not timestamps).
        String json = new ObjectMapper().registerModule(new JavaTimeModule())
                .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .writeValueAsString(List.of(sample));
        assertThat(json).contains("pickupAddress", "pickupCity");

        RestClient.Builder builder = RestClient.builder().baseUrl("http://order-service");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://order-service/api/v1/orders/ready-for-dispatch?branchId=3&limit=10"))
                .andExpect(header("X-Service-Key", "some-key"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        List<DispatchOrderDetails> orders = builder.build().get()
                .uri(u -> u.path("/api/v1/orders/ready-for-dispatch").queryParam("branchId", 3).queryParam("limit", 10).build())
                .header("X-Service-Key", "some-key")
                .retrieve()
                .body(new ParameterizedTypeReference<List<DispatchOrderDetails>>() { });

        server.verify();
        assertThat(orders).hasSize(1);
        DispatchOrderDetails order = orders.get(0);
        assertThat(order.id).isEqualTo(7L);
        assertThat(order.recipientName).isEqualTo("Ayesha Perera");
        assertThat(order.deliveryAddress).isEqualTo("12/4 Peradeniya Road, Kandy");
        assertThat(order.city).isEqualTo("Kandy");
        assertThat(order.weightKg).isEqualTo(1.5);
        assertThat(order.createdAt).isEqualTo(LocalDateTime.of(2026, 11, 13, 8, 30));
    }
}
