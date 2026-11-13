package com.swiftdrop.order.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.dto.CreateOrderRequest;
import com.swiftdrop.order.dto.OrderResponse;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.security.CustomerIdResolver;
import com.swiftdrop.order.service.OrderService;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@Import({SecurityConfig.class, JacksonConfig.class, CustomerIdResolver.class})
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=true",
        "swiftdrop.security.jwt-secret=" + TestTokens.SECRET
})
class OrderControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private OrderService orderService;

    // ------------------------------------------------------------------ helpers

    private Map<String, Object> validBody() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pickupAddress", "45 Galle Road, Colombo 03");
        body.put("pickupContactName", "Nuwan Pradeep");
        body.put("pickupContactPhone", "+94 77 123 4567");
        body.put("dropoffAddress", "12/4 Peradeniya Road, Kandy");
        body.put("dropoffContactName", "Ayesha Perera");
        body.put("dropoffContactPhone", "0718849201");
        body.put("parcelDescription", "Electronic accessories");
        body.put("parcelSize", "MEDIUM");
        body.put("weightKg", 1.8);
        body.put("deliveryInstructions", "Call on arrival");
        return body;
    }

    private MockHttpServletRequestBuilder createRequest(String token, Map<String, Object> body) throws Exception {
        MockHttpServletRequestBuilder builder = post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
        return token == null ? builder : builder.header("Authorization", "Bearer " + token);
    }

    private static OrderResponse sampleResponse(long id) {
        return new OrderResponse(id, "SD-261113-AAAA2222", OrderStatus.CREATED, new BigDecimal("2400.00"), "LKR",
                "45 Galle Road, Colombo 03", "Nuwan Pradeep", "+94 77 123 4567",
                "12/4 Peradeniya Road, Kandy", "Ayesha Perera", "0718849201",
                "Electronic accessories", ParcelSize.MEDIUM, new BigDecimal("1.80"), "Call on arrival",
                null, null, Instant.parse("2026-11-13T10:00:00Z"), Instant.parse("2026-11-13T10:00:00Z"));
    }

    // ------------------------------------------------------------------ create: success

    @Test
    @DisplayName("creates an order: 201, Location header, tracking number and CREATED status code")
    void createsOrder() throws Exception {
        when(orderService.createOrder(eq(42L), any(CreateOrderRequest.class), isNull())).thenReturn(sampleResponse(7));

        mvc.perform(createRequest(TestTokens.customer(42), validBody()))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/orders/7"))
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.trackingNumber").value("SD-261113-AAAA2222"))
                .andExpect(jsonPath("$.status").value("CREATED"))
                .andExpect(jsonPath("$.deliveryFee").value(2400.00));
    }

    @Test
    @DisplayName("works through the gateway-stripped path /orders as well")
    void gatewayPath() throws Exception {
        when(orderService.createOrder(eq(42L), any(), isNull())).thenReturn(sampleResponse(8));

        mvc.perform(post("/orders")
                        .header("Authorization", "Bearer " + TestTokens.customer(42))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validBody())))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("the customer id comes from the token; a customerId/fee/status in the body is ignored")
    void customerIdComesFromToken() throws Exception {
        when(orderService.createOrder(eq(42L), any(), isNull())).thenReturn(sampleResponse(9));
        Map<String, Object> body = validBody();
        body.put("customerId", 999);
        body.put("deliveryFee", 1);
        body.put("status", "DELIVERED");
        body.put("trackingNumber", "SD-HACKED");

        mvc.perform(createRequest(TestTokens.customer(42), body)).andExpect(status().isCreated());

        verify(orderService).createOrder(eq(42L), any(CreateOrderRequest.class), isNull());
        verify(orderService, never()).createOrder(eq(999L), any(), any());
    }

    @Test
    @DisplayName("with auth enabled, an X-Customer-Id header cannot impersonate another customer")
    void customerIdHeaderIsIgnoredWhenAuthIsEnabled() throws Exception {
        when(orderService.createOrder(eq(42L), any(), isNull())).thenReturn(sampleResponse(12));

        mvc.perform(createRequest(TestTokens.customer(42), validBody()).header("X-Customer-Id", "999"))
                .andExpect(status().isCreated());

        verify(orderService).createOrder(eq(42L), any(CreateOrderRequest.class), isNull());
        verify(orderService, never()).createOrder(eq(999L), any(), any());
    }

    @Test
    @DisplayName("input is trimmed before the service sees it")
    void inputIsTrimmed() throws Exception {
        when(orderService.createOrder(eq(42L), any(), isNull())).thenReturn(sampleResponse(10));
        Map<String, Object> body = validBody();
        body.put("pickupAddress", "   45 Galle Road, Colombo 03   ");

        mvc.perform(createRequest(TestTokens.customer(42), body)).andExpect(status().isCreated());

        ArgumentCaptor<CreateOrderRequest> captor = ArgumentCaptor.forClass(CreateOrderRequest.class);
        verify(orderService).createOrder(eq(42L), captor.capture(), isNull());
        assertThat(captor.getValue().pickupAddress()).isEqualTo("45 Galle Road, Colombo 03");
    }

    @Test
    @DisplayName("passes a valid Idempotency-Key to the service")
    void idempotencyKeyIsForwarded() throws Exception {
        when(orderService.createOrder(eq(42L), any(), eq("abc-123"))).thenReturn(sampleResponse(11));

        mvc.perform(createRequest(TestTokens.customer(42), validBody()).header("Idempotency-Key", "abc-123"))
                .andExpect(status().isCreated());
    }

    // ------------------------------------------------------------------ create: validation

    static Stream<Arguments> invalidValues() {
        return Stream.of(
                Arguments.of("pickupAddress", "    "),
                Arguments.of("pickupAddress", "  ab  "),
                Arguments.of("dropoffAddress", ""),
                Arguments.of("pickupContactName", "A"),
                Arguments.of("pickupContactPhone", "abc"),
                Arguments.of("dropoffContactPhone", "12"),
                Arguments.of("weightKg", 0),
                Arguments.of("weightKg", -1),
                Arguments.of("weightKg", new BigDecimal("100.01")),
                Arguments.of("weightKg", new BigDecimal("1.234")),
                Arguments.of("parcelSize", null));
    }

    @ParameterizedTest(name = "{0} = {1} is rejected")
    @MethodSource("invalidValues")
    @DisplayName("invalid addresses, contacts, weights and sizes are rejected with field errors")
    void rejectsInvalidFields(String field, Object value) throws Exception {
        Map<String, Object> body = validBody();
        body.put(field, value);

        mvc.perform(createRequest(TestTokens.customer(42), body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.fieldErrors." + field).exists());

        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("an unknown parcel size is a 400, not a 500")
    void unknownParcelSize() throws Exception {
        Map<String, Object> body = validBody();
        body.put("parcelSize", "HUGE");

        mvc.perform(createRequest(TestTokens.customer(42), body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("HUGE"))));
    }

    @Test
    @DisplayName("a missing required field is rejected")
    void missingField() throws Exception {
        Map<String, Object> body = validBody();
        body.remove("dropoffAddress");

        mvc.perform(createRequest(TestTokens.customer(42), body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.dropoffAddress").exists());
    }

    @Test
    @DisplayName("malformed JSON is a 400, not a 500")
    void malformedJson() throws Exception {
        mvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + TestTokens.customer(42))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ not json"))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @CsvSource({"'has space'", "'bad/slash'", "'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'"})
    @DisplayName("an invalid Idempotency-Key is rejected")
    void invalidIdempotencyKey(String key) throws Exception {
        mvc.perform(createRequest(TestTokens.customer(42), validBody()).header("Idempotency-Key", key))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(orderService);
    }

    // ------------------------------------------------------------------ authentication / authorization

    @Test
    @DisplayName("no token: 401")
    void noToken() throws Exception {
        mvc.perform(createRequest(null, validBody()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("a token signed with a different secret: 401")
    void wrongSignature() throws Exception {
        String forged = TestTokens.token("another-secret-another-secret-1234567890", "42", "CUSTOMER",
                Instant.now().plusSeconds(3600));

        mvc.perform(createRequest(forged, validBody())).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("an expired token: 401")
    void expiredToken() throws Exception {
        String expired = TestTokens.token(TestTokens.SECRET, "42", "CUSTOMER", Instant.now().minusSeconds(3600));

        mvc.perform(createRequest(expired, validBody())).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("a token whose subject is not a numeric user id: 401")
    void nonNumericSubject() throws Exception {
        String token = TestTokens.token(TestTokens.SECRET, "CUST-001", "CUSTOMER", Instant.now().plusSeconds(3600));

        mvc.perform(createRequest(token, validBody())).andExpect(status().isUnauthorized());
        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("a valid token without the CUSTOMER role: 403")
    void wrongRole() throws Exception {
        String courier = TestTokens.token(TestTokens.SECRET, "42", "COURIER", Instant.now().plusSeconds(3600));

        mvc.perform(createRequest(courier, validBody()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
        verifyNoInteractions(orderService);
    }

    // ------------------------------------------------------------------ get by id

    @Test
    @DisplayName("the owner reads their order")
    void ownerReads() throws Exception {
        when(orderService.getOrder(42L, 7L)).thenReturn(sampleResponse(7));

        mvc.perform(get("/api/v1/orders/7").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trackingNumber").value("SD-261113-AAAA2222"));
    }

    @Test
    @DisplayName("another customer's order: 404, and the lookup uses the caller's id from the token")
    void foreignOrderIsNotFound() throws Exception {
        when(orderService.getOrder(43L, 7L)).thenThrow(new ResourceNotFoundException("Order not found"));

        mvc.perform(get("/api/v1/orders/7").header("Authorization", "Bearer " + TestTokens.customer(43)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Order not found"));

        verify(orderService).getOrder(43L, 7L);
    }

    @Test
    @DisplayName("reading an order without a token: 401")
    void getWithoutToken() throws Exception {
        mvc.perform(get("/api/v1/orders/7")).andExpect(status().isUnauthorized());
    }
}
