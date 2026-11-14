package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.courier.CourierJobResponse;
import com.swiftdrop.dispatch.dto.courier.CourierProfileResponse;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.entity.enums.VehicleType;
import com.swiftdrop.dispatch.exception.CourierPortalException;
import com.swiftdrop.dispatch.exception.CourierPortalExceptionHandler;
import com.swiftdrop.dispatch.exception.GlobalExceptionHandler;
import com.swiftdrop.dispatch.repository.CourierRepository;
import com.swiftdrop.dispatch.security.CurrentCourierResolver;
import com.swiftdrop.dispatch.service.CourierPortalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CourierPortalController.class)
@Import({CurrentCourierResolver.class, CourierPortalExceptionHandler.class, GlobalExceptionHandler.class})
class CourierPortalControllerTest {

    private static final String BASE = "/api/v1/dispatch/couriers/me";
    private static final long USER_ID = 990103L;
    private static final long COURIER_ID = 103L;

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CourierPortalService service;

    @MockBean
    private CourierRepository courierRepository;

    @BeforeEach
    void linkedCourier() {
        Courier courier = new Courier("CR-103", USER_ID, "Kasun Dias", "+94 72 333 8899", CourierStatus.AVAILABLE,
                VehicleType.MOTORCYCLE, "WP BHK-4471", 1L, 8);
        courier.setId(COURIER_ID);
        lenient().when(courierRepository.findByUserId(USER_ID)).thenReturn(Optional.of(courier));
    }

    private static MockHttpServletRequestBuilder asCourier(MockHttpServletRequestBuilder request) {
        return request.header("X-User-Id", String.valueOf(USER_ID)).header("X-User-Role", "COURIER");
    }

    private static CourierProfileResponse profile(CourierStatus status) {
        return new CourierProfileResponse(COURIER_ID, "CR-103", "Kasun Dias", "+94 72 333 8899", status,
                VehicleType.MOTORCYCLE, "WP BHK-4471", 1L, 8, 0);
    }

    private static CourierJobResponse job(AssignmentStatus status) {
        return new CourierJobResponse(7101L, "ASN-7101", 42L, "SD-261114-ABC", status, "STANDARD",
                new CourierJobResponse.Stop("Cafe Mocha", null, "12 Galle Road", "Colombo"),
                new CourierJobResponse.Recipient("Amali Perera", "+94 77 123 4567", "18 Rajagiriya Rd", "Rajagiriya"),
                new CourierJobResponse.Parcel("SMALL", null, null),
                null, LocalDateTime.of(2026, 11, 14, 7, 0), null, null, null, null);
    }

    @Test
    @DisplayName("GET profile resolves the courier from X-User-Id and returns no-store")
    void getProfile() throws Exception {
        when(service.getProfile(COURIER_ID)).thenReturn(profile(CourierStatus.AVAILABLE));

        mockMvc.perform(asCourier(get(BASE)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.courierCode", is("CR-103")));
    }

    @Test
    @DisplayName("gateway path /couriers/me works too")
    void gatewayPath() throws Exception {
        when(service.getProfile(COURIER_ID)).thenReturn(profile(CourierStatus.AVAILABLE));

        mockMvc.perform(asCourier(get("/couriers/me"))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("missing identity headers is 401 and the service is not called")
    void missingHeaders() throws Exception {
        mockMvc.perform(get(BASE))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Missing courier identity.")));
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("non-numeric user id is 401")
    void badUserId() throws Exception {
        mockMvc.perform(get(BASE).header("X-User-Id", "abc").header("X-User-Role", "COURIER"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("a non-courier role is 403")
    void wrongRole() throws Exception {
        mockMvc.perform(get(BASE).header("X-User-Id", String.valueOf(USER_ID)).header("X-User-Role", "DISPATCHER"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("a user with no courier profile is 404")
    void noCourierProfile() throws Exception {
        when(courierRepository.findByUserId(5L)).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE).header("X-User-Id", "5").header("X-User-Role", "courier"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PATCH availability validates the body (400 with fieldErrors)")
    void availabilityValidation() throws Exception {
        mockMvc.perform(asCourier(patch(BASE + "/availability"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.online", notNullValue()));
    }

    @Test
    @DisplayName("PATCH availability offline returns the updated profile")
    void goOffline() throws Exception {
        when(service.setAvailability(COURIER_ID, false)).thenReturn(profile(CourierStatus.OFFLINE));

        mockMvc.perform(asCourier(patch(BASE + "/availability"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"online\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("OFFLINE")));
    }

    @Test
    @DisplayName("GET assignments returns the courier's jobs with details")
    void listJobs() throws Exception {
        when(service.listJobs(COURIER_ID, null)).thenReturn(List.of(job(AssignmentStatus.ASSIGNED)));

        mockMvc.perform(asCourier(get(BASE + "/assignments")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].recipient.name", is("Amali Perera")));
    }

    @Test
    @DisplayName("PUT proof-of-delivery validates the body (400)")
    void podValidation() throws Exception {
        mockMvc.perform(asCourier(put(BASE + "/assignments/7101/proof-of-delivery"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OTP\",\"reference\":\"\",\"receivedBy\":\"A\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.reference", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.receivedBy", notNullValue()));
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("unknown proof type is 400, not 500")
    void unknownPodType() throws Exception {
        mockMvc.perform(asCourier(put(BASE + "/assignments/7101/proof-of-delivery"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"FINGERPRINT\",\"reference\":\"1\",\"receivedBy\":\"Amali\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT proof-of-delivery saves the proof")
    void pod() throws Exception {
        when(service.recordProofOfDelivery(eq(COURIER_ID), eq(7101L), any())).thenReturn(job(AssignmentStatus.IN_TRANSIT));

        mockMvc.perform(asCourier(put(BASE + "/assignments/7101/proof-of-delivery"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OTP\",\"reference\":\"4417\",\"receivedBy\":\"Amali Perera\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignmentId", is(7101)));
    }

    @Test
    @DisplayName("proof before pickup is 409")
    void podConflict() throws Exception {
        when(service.recordProofOfDelivery(eq(COURIER_ID), eq(7101L), any()))
                .thenThrow(CourierPortalException.conflict("Pick up the parcel before adding proof of delivery."));

        mockMvc.perform(asCourier(put(BASE + "/assignments/7101/proof-of-delivery"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OTP\",\"reference\":\"4417\",\"receivedBy\":\"Amali Perera\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("PUT failure-details requires notes of at least 5 characters (400)")
    void failureValidation() throws Exception {
        mockMvc.perform(asCourier(put(BASE + "/assignments/7101/failure-details"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Recipient not available\",\"notes\":\"no\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.notes", notNullValue()));
    }

    @Test
    @DisplayName("unexpected errors are 500 without the exception message")
    void unexpected() throws Exception {
        when(service.getProfile(COURIER_ID)).thenThrow(new IllegalStateException("SQL secret detail"));

        mockMvc.perform(asCourier(get(BASE)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message", is("An unexpected error occurred.")));
    }
}
