package com.swiftdrop.order.controller;

import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.dto.PublicTrackingEventResponse;
import com.swiftdrop.order.dto.PublicTrackingResponse;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.service.TrackingService;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The public tracking endpoint with authentication ON: it must stay reachable without any token. */
@WebMvcTest(TrackingController.class)
@Import({SecurityConfig.class, JacksonConfig.class})
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=true",
        "swiftdrop.security.jwt-secret=" + TestTokens.SECRET
})
class TrackingControllerTest {

    private static final String NUMBER = "SD-261113-K7Q2XM4T";

    @Autowired private MockMvc mvc;
    @MockBean private TrackingService trackingService;

    private static PublicTrackingResponse sample() {
        return new PublicTrackingResponse(NUMBER, OrderStatus.IN_TRANSIT, "In Transit", "Colombo", "Kandy",
                ParcelSize.MEDIUM, new BigDecimal("94.34"), Instant.parse("2026-11-13T09:00:00Z"), List.of(
                new PublicTrackingEventResponse(OrderStatus.CREATED, "Created", "Order placed",
                        Instant.parse("2026-11-13T08:00:00Z")),
                new PublicTrackingEventResponse(OrderStatus.IN_TRANSIT, "In Transit", "Parcel is on its way",
                        Instant.parse("2026-11-13T09:00:00Z"))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/tracking/", "/tracking/", "/api/v1/orders/tracking/", "/orders/tracking/"})
    @DisplayName("works without a token on the contract path and on every gateway path")
    void publicWithoutToken(String prefix) throws Exception {
        when(trackingService.track(NUMBER)).thenReturn(sample());

        mvc.perform(get(prefix + NUMBER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trackingNumber").value(NUMBER))
                .andExpect(jsonPath("$.status").value("IN_TRANSIT"))
                .andExpect(jsonPath("$.statusLabel").value("In Transit"))
                .andExpect(jsonPath("$.origin").value("Colombo"))
                .andExpect(jsonPath("$.destination").value("Kandy"))
                .andExpect(jsonPath("$.parcelCategory").value("MEDIUM"))
                .andExpect(jsonPath("$.distanceKm").value(94.34))
                .andExpect(jsonPath("$.updatedAt").value("2026-11-13T09:00:00Z"))
                .andExpect(jsonPath("$.events.length()").value(2))
                .andExpect(jsonPath("$.events[0].statusLabel").value("Created"))
                .andExpect(jsonPath("$.events[1].description").value("Parcel is on its way"));
    }

    @Test
    @DisplayName("the response contains only the allow-listed fields")
    void onlySafeFields() throws Exception {
        when(trackingService.track(NUMBER)).thenReturn(sample());

        mvc.perform(get("/api/v1/tracking/" + NUMBER))
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.customerId").doesNotExist())
                .andExpect(jsonPath("$.branchId").doesNotExist())
                .andExpect(jsonPath("$.deliveryFee").doesNotExist())
                .andExpect(jsonPath("$.pickupAddress").doesNotExist())
                .andExpect(jsonPath("$.dropoffContactPhone").doesNotExist())
                .andExpect(jsonPath("$.events[0].note").doesNotExist())
                .andExpect(jsonPath("$.events[0].location").doesNotExist())
                .andExpect(jsonPath("$.events[0].changedBy").doesNotExist());
    }

    @Test
    @DisplayName("the answer is never cached, because the status keeps changing")
    void notCached() throws Exception {
        when(trackingService.track(NUMBER)).thenReturn(sample());

        mvc.perform(get("/api/v1/tracking/" + NUMBER)).andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    @DisplayName("an unknown number is a 404 with the standard error body")
    void notFound() throws Exception {
        when(trackingService.track("SD-261113-ZZZZ9999")).thenThrow(new ResourceNotFoundException("Tracking number not found"));

        mvc.perform(get("/api/v1/tracking/SD-261113-ZZZZ9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Tracking number not found"));
    }

    @Test
    @DisplayName("the number is handed to the service as typed; the service normalises it")
    void passesRawNumber() throws Exception {
        when(trackingService.track("sd-261113-k7q2xm4t")).thenReturn(sample());

        mvc.perform(get("/api/v1/tracking/sd-261113-k7q2xm4t")).andExpect(status().isOk());
        verify(trackingService).track("sd-261113-k7q2xm4t");
    }

    @ParameterizedTest
    @ValueSource(strings = {"garbage", "eyJhbGciOiJIUzI1NiJ9.e30.invalidsignature"})
    @DisplayName("a stale or invalid token sent by a logged-in browser does not block the public endpoint")
    void invalidTokenIgnored(String token) throws Exception {
        when(trackingService.track(NUMBER)).thenReturn(sample());

        mvc.perform(get("/api/v1/tracking/" + NUMBER).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a valid token is also fine")
    void validTokenIgnored() throws Exception {
        when(trackingService.track(NUMBER)).thenReturn(sample());

        mvc.perform(get("/api/v1/tracking/" + NUMBER).header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("tracking is read-only: POST is not allowed")
    void readOnly() throws Exception {
        mvc.perform(post("/api/v1/tracking/" + NUMBER)).andExpect(status().is4xxClientError());
    }
}
