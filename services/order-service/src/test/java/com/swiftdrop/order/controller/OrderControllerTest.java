package com.swiftdrop.order.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.dto.CreateOrderRequest;
import com.swiftdrop.order.dto.OrderResponse;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.exception.PriceChangedException;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.location.City;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.pricing.FeeBreakdown;
import com.swiftdrop.order.pricing.PriceQuote;
import com.swiftdrop.order.pricing.PricingService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
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
@Import({SecurityConfig.class, JacksonConfig.class, CustomerIdResolver.class, CityDirectory.class})
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=true",
        "swiftdrop.security.jwt-secret=" + TestTokens.SECRET
})
class OrderControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private OrderService orderService;
    @MockBean private PricingService pricingService;

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
        body.put("pickupCity", "COLOMBO");
        body.put("dropoffCity", "KANDY");
        return body;
    }

    private static PriceQuote sampleQuote() {
        FeeBreakdown fee = new FeeBreakdown(new BigDecimal("500.00"), new BigDecimal("80.00"),
                new BigDecimal("943.40"), new BigDecimal("200.00"), new BigDecimal("1723.40"), "LKR");
        return new PriceQuote(fee, new BigDecimal("94.34"),
                new City("COLOMBO", "Colombo", "Colombo", 6.9271, 79.8612),
                new City("KANDY", "Kandy", "Kandy", 7.2906, 80.6337), true);
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
                new BigDecimal("94.34"), null, Instant.parse("2026-11-13T10:00:00Z"), Instant.parse("2026-11-13T10:00:00Z"),
                "COLOMBO", "KANDY", sampleQuote().fee());
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
                Arguments.of("parcelSize", null),
                Arguments.of("pickupCity", null),
                Arguments.of("pickupCity", "ATLANTIS"),
                Arguments.of("dropoffCity", ""),
                Arguments.of("dropoffCity", "ATLANTIS"),
                Arguments.of("expectedFee", -1),
                Arguments.of("expectedFee", new BigDecimal("10.123")));
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

    // ------------------------------------------------------------------ list

    @Test
    @DisplayName("lists the caller's orders as a JSON array with the total in X-Total-Count")
    void listsOwnOrders() throws Exception {
        when(orderService.listOrders(42L, 0, 20)).thenReturn(
                new PageImpl<>(List.of(sampleResponse(2), sampleResponse(1)), PageRequest.of(0, 20), 2));

        mvc.perform(get("/api/v1/orders").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "2"))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[1].id").value(1));
    }

    @Test
    @DisplayName("an empty history is an empty array, not an error")
    void emptyHistory() throws Exception {
        when(orderService.listOrders(42L, 0, 20)).thenReturn(Page.empty());

        mvc.perform(get("/api/v1/orders").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "0"))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("page and size are passed through to the service, scoped to the caller from the token")
    void pagingParameters() throws Exception {
        when(orderService.listOrders(43L, 2, 5)).thenReturn(Page.empty());

        mvc.perform(get("/api/v1/orders?page=2&size=5")
                        .header("Authorization", "Bearer " + TestTokens.customer(43))
                        .header("X-Customer-Id", "999"))
                .andExpect(status().isOk());

        verify(orderService).listOrders(43L, 2, 5);
    }

    @ParameterizedTest(name = "{0} is rejected")
    @CsvSource({"page=-1", "size=0", "size=101", "page=abc", "size=abc"})
    @DisplayName("invalid paging parameters are a 400")
    void invalidPaging(String query) throws Exception {
        mvc.perform(get("/api/v1/orders?" + query).header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("listing without a token: 401; with the wrong role: 403")
    void listRequiresCustomerRole() throws Exception {
        mvc.perform(get("/api/v1/orders")).andExpect(status().isUnauthorized());

        String courier = TestTokens.token(TestTokens.SECRET, "42", "COURIER", Instant.now().plusSeconds(3600));
        mvc.perform(get("/api/v1/orders").header("Authorization", "Bearer " + courier))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------ quote

    private Map<String, Object> quoteBody() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pickupCity", "COLOMBO");
        body.put("dropoffCity", "KANDY");
        body.put("parcelSize", "MEDIUM");
        body.put("weightKg", 1.8);
        return body;
    }

    private MockHttpServletRequestBuilder quoteRequest(String path, String token, Map<String, Object> body) throws Exception {
        MockHttpServletRequestBuilder builder = post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
        return token == null ? builder : builder.header("Authorization", "Bearer " + token);
    }

    @Test
    @DisplayName("quote returns the fee, currency, distance and the breakdown, in the shape the frontend expects")
    void quoteReturnsFeeAndBreakdown() throws Exception {
        when(pricingService.quote("COLOMBO", "KANDY", ParcelSize.MEDIUM, new BigDecimal("1.8"))).thenReturn(sampleQuote());

        mvc.perform(quoteRequest("/api/v1/orders/quote", TestTokens.customer(42), quoteBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estimatedFee").value(1723.40))
                .andExpect(jsonPath("$.currency").value("LKR"))
                .andExpect(jsonPath("$.estimatedDistanceKm").value(94.34))
                .andExpect(jsonPath("$.breakdown.baseFee").value(500.00))
                .andExpect(jsonPath("$.breakdown.weightFee").value(80.00))
                .andExpect(jsonPath("$.breakdown.distanceFee").value(943.40))
                .andExpect(jsonPath("$.breakdown.zoneSurcharge").value(200.00))
                .andExpect(jsonPath("$.breakdown.totalFee").value(1723.40));
    }

    @Test
    @DisplayName("quote works on the gateway-stripped path and ignores extra fields such as street addresses")
    void quoteGatewayPathIgnoresExtraFields() throws Exception {
        when(pricingService.quote(any(), any(), any(), any())).thenReturn(sampleQuote());
        Map<String, Object> body = quoteBody();
        body.put("pickupAddress", "45 Galle Road, Colombo 03");
        body.put("dropoffAddress", "12/4 Peradeniya Road, Kandy");

        mvc.perform(quoteRequest("/orders/quote", TestTokens.customer(42), body)).andExpect(status().isOk());
    }

    @ParameterizedTest(name = "quote with {0} = {1} is rejected")
    @MethodSource("invalidQuoteValues")
    @DisplayName("quote rejects missing or unsupported towns and invalid weights with field errors")
    void quoteValidation(String field, Object value) throws Exception {
        Map<String, Object> body = quoteBody();
        body.put(field, value);

        mvc.perform(quoteRequest("/api/v1/orders/quote", TestTokens.customer(42), body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors." + field).exists());

        verifyNoInteractions(pricingService);
    }

    static Stream<Arguments> invalidQuoteValues() {
        return Stream.of(
                Arguments.of("pickupCity", null),
                Arguments.of("pickupCity", ""),
                Arguments.of("pickupCity", "ATLANTIS"),
                Arguments.of("dropoffCity", null),
                Arguments.of("dropoffCity", "ATLANTIS"),
                Arguments.of("parcelSize", null),
                Arguments.of("weightKg", 0),
                Arguments.of("weightKg", new BigDecimal("100.01")),
                Arguments.of("weightKg", new BigDecimal("1.234")));
    }

    @Test
    @DisplayName("a weight too heavy for the parcel size is a 422 with the reason")
    void quoteBusinessRule() throws Exception {
        when(pricingService.quote(any(), any(), any(), any()))
                .thenThrow(new BusinessRuleException("A SMALL parcel can weigh at most 2 kg. Choose a larger size or reduce the weight."));

        mvc.perform(quoteRequest("/api/v1/orders/quote", TestTokens.customer(42), quoteBody()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("SMALL")));
    }

    @Test
    @DisplayName("quote needs a token (401) and the CUSTOMER role (403)")
    void quoteRequiresCustomerRole() throws Exception {
        mvc.perform(quoteRequest("/api/v1/orders/quote", null, quoteBody())).andExpect(status().isUnauthorized());

        String courier = TestTokens.token(TestTokens.SECRET, "42", "COURIER", Instant.now().plusSeconds(3600));
        mvc.perform(quoteRequest("/api/v1/orders/quote", courier, quoteBody())).andExpect(status().isForbidden());
        verifyNoInteractions(pricingService);
    }

    // ------------------------------------------------------------------ cities

    @Test
    @DisplayName("lists the supported towns sorted by name, with code, name and district but no coordinates")
    void listsCities() throws Exception {
        mvc.perform(get("/api/v1/orders/cities").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(25)))
                .andExpect(jsonPath("$[0].code").value("AMPARA"))
                .andExpect(jsonPath("$[0].name").value("Ampara"))
                .andExpect(jsonPath("$[0].district").value("Ampara"))
                .andExpect(jsonPath("$[0].latitude").doesNotExist())
                .andExpect(jsonPath("$[0].longitude").doesNotExist());
    }

    @Test
    @DisplayName("the town list also needs a token")
    void citiesRequireToken() throws Exception {
        mvc.perform(get("/api/v1/orders/cities")).andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ create: pricing-related errors

    @Test
    @DisplayName("the towns and expected fee are passed to the service")
    void citiesAndExpectedFeeAreForwarded() throws Exception {
        when(orderService.createOrder(eq(42L), any(), isNull())).thenReturn(sampleResponse(20));
        Map<String, Object> body = validBody();
        body.put("expectedFee", 1723.40);

        mvc.perform(createRequest(TestTokens.customer(42), body)).andExpect(status().isCreated());

        ArgumentCaptor<CreateOrderRequest> captor = ArgumentCaptor.forClass(CreateOrderRequest.class);
        verify(orderService).createOrder(eq(42L), captor.capture(), isNull());
        assertThat(captor.getValue().pickupCity()).isEqualTo("COLOMBO");
        assertThat(captor.getValue().dropoffCity()).isEqualTo("KANDY");
        assertThat(captor.getValue().expectedFee()).isEqualByComparingTo("1723.40");
    }

    @Test
    @DisplayName("an expected fee that no longer matches is a 409 so the client can show the new quote")
    void priceChangedIs409() throws Exception {
        when(orderService.createOrder(eq(42L), any(), isNull())).thenThrow(new PriceChangedException());

        mvc.perform(createRequest(TestTokens.customer(42), validBody()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("fee has changed")));
    }

    @Test
    @DisplayName("an order whose weight is too heavy for the size is a 422")
    void createBusinessRule() throws Exception {
        when(orderService.createOrder(eq(42L), any(), isNull()))
                .thenThrow(new BusinessRuleException("A SMALL parcel can weigh at most 2 kg. Choose a larger size or reduce the weight."));

        mvc.perform(createRequest(TestTokens.customer(42), validBody()))
                .andExpect(status().isUnprocessableEntity());
    }
}
