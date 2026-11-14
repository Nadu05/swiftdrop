package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.CourierAvailabilityResponse;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.exception.GlobalExceptionHandler;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.service.CourierService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CourierController.class)
@Import(GlobalExceptionHandler.class)
@ActiveProfiles("test")
class CourierControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CourierService courierService;

    @Test
    @DisplayName("Should return courier availability list at /api/v1/dispatch/couriers/availability")
    void shouldReturnCourierAvailabilityList() throws Exception {
        CourierAvailabilityResponse available = new CourierAvailabilityResponse(
                5L, "CR-101", "Kamal Silva", CourierStatus.AVAILABLE, 2, 5, true, null
        );
        CourierAvailabilityResponse busy = new CourierAvailabilityResponse(
                8L, "CR-102", "Nimal Perera", CourierStatus.BUSY, 1, 5, false, "Courier is currently busy"
        );

        when(courierService.getCourierAvailability(null, null)).thenReturn(List.of(available, busy));

        mockMvc.perform(get("/api/v1/dispatch/couriers/availability"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(5)))
                .andExpect(jsonPath("$[0].courierCode", is("CR-101")))
                .andExpect(jsonPath("$[0].status", is("AVAILABLE")))
                .andExpect(jsonPath("$[0].activeDeliveries", is(2)))
                .andExpect(jsonPath("$[0].maxCapacity", is(5)))
                .andExpect(jsonPath("$[0].isEligible", is(true)))
                .andExpect(jsonPath("$[0].ineligibilityReason", nullValue()))
                .andExpect(jsonPath("$[1].isEligible", is(false)))
                .andExpect(jsonPath("$[1].ineligibilityReason", is("Courier is currently busy")));
    }

    @Test
    @DisplayName("Should support gateway stripped dual-mapping at /couriers/availability with status and branchId filters")
    void shouldSupportDualMappingAndFilters() throws Exception {
        CourierAvailabilityResponse available = new CourierAvailabilityResponse(
                5L, "CR-101", "Kamal Silva", CourierStatus.AVAILABLE, 1, 5, true, null
        );

        when(courierService.getCourierAvailability(CourierStatus.AVAILABLE, 100L))
                .thenReturn(List.of(available));

        mockMvc.perform(get("/couriers/availability")
                        .param("status", "available")
                        .param("branchId", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(5)))
                .andExpect(jsonPath("$[0].isEligible", is(true)));
    }

    @Test
    @DisplayName("Should return 400 Bad Request when status query param is invalid")
    void shouldReturn400WhenInvalidStatusFilter() throws Exception {
        mockMvc.perform(get("/api/v1/dispatch/couriers/availability")
                        .param("status", "UNKNOWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("Should return single courier availability by ID and 404 when not found")
    void shouldReturnSingleCourierAvailabilityAnd404WhenMissing() throws Exception {
        CourierAvailabilityResponse response = new CourierAvailabilityResponse(
                5L, "CR-101", "Kamal Silva", CourierStatus.AVAILABLE, 0, 5, true, null
        );

        when(courierService.getCourierAvailabilityById(5L)).thenReturn(response);
        when(courierService.getCourierAvailabilityById(999L))
                .thenThrow(new ResourceNotFoundException("Courier", 999L));

        mockMvc.perform(get("/api/v1/dispatch/couriers/5/availability"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(5)))
                .andExpect(jsonPath("$.isEligible", is(true)));

        mockMvc.perform(get("/api/v1/dispatch/couriers/999/availability"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }
}

