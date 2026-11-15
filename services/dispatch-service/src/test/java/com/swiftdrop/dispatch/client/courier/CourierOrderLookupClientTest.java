package com.swiftdrop.dispatch.client.courier;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class CourierOrderLookupClientTest {

    private static final String PATH = "/api/v1/orders/ready-for-dispatch";

    @Test
    void readsPickupFieldsAndSendsServiceKey() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://order");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://order" + PATH + "?limit=200"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-Service-Key", "k".repeat(32)))
                .andRespond(withSuccess("""
                        [{"id":42,"trackingNumber":"SD-1","recipientName":"Amali","pickupAddress":"12 Galle Rd",
                          "pickupCity":"Colombo","weightKg":1.5,"createdAt":"2026-11-14T08:00:00","extra":"x"}]
                        """, MediaType.APPLICATION_JSON));

        var orders = new CourierOrderLookupClient(builder.build(), PATH, "k".repeat(32)).findOpenOrders();

        assertThat(orders).hasSize(1);
        assertThat(orders.get(0).pickupAddress()).isEqualTo("12 Galle Rd");
        assertThat(orders.get(0).weightKg()).isEqualTo(1.5);
        server.verify();
    }

    @Test
    void noKeyHeaderWhenKeyNotSet() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://order");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://order" + PATH + "?limit=200"))
                .andExpect(headerDoesNotExist("X-Service-Key"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(new CourierOrderLookupClient(builder.build(), PATH, "").findOpenOrders()).isEmpty();
        server.verify();
    }

    @Test
    void orderErrorsGiveAnEmptyList() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://order");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://order" + PATH + "?limit=200")).andRespond(withServerError());

        assertThat(new CourierOrderLookupClient(builder.build(), PATH, "").findOpenOrders()).isEmpty();
    }
}
