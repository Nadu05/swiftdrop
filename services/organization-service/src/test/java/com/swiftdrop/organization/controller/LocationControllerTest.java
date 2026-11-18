package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.DistrictDto;
import com.swiftdrop.organization.dto.DsDivisionDto;
import com.swiftdrop.organization.dto.GnDivisionDto;
import com.swiftdrop.organization.dto.PostalAreaDto;
import com.swiftdrop.organization.dto.ProvinceDto;
import com.swiftdrop.organization.exception.GlobalExceptionHandler;
import com.swiftdrop.organization.service.LocationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LocationController.class)
@Import({
        GlobalExceptionHandler.class,
        com.swiftdrop.organization.config.SecurityConfig.class,
        com.swiftdrop.organization.security.OrganizationJwtService.class
})
class LocationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LocationService locationService;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /locations/provinces returns provinces")
    void shouldReturnProvinces() throws Exception {
        when(locationService.getProvinces()).thenReturn(List.of(
                new ProvinceDto(1L, "WP", "Western", 6.9271, 79.8612)
        ));

        mockMvc.perform(get("/locations/provinces"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("WP"))
                .andExpect(jsonPath("$[0].name").value("Western"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /locations/districts?provinceId=1 returns filtered districts")
    void shouldReturnDistrictsByProvince() throws Exception {
        when(locationService.getDistricts(1L)).thenReturn(List.of(
                new DistrictDto(10L, "COL", "Colombo", 1L, "Western", 6.9271, 79.8612)
        ));

        mockMvc.perform(get("/locations/districts").param("provinceId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("COL"))
                .andExpect(jsonPath("$[0].provinceId").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /locations/ds-divisions?districtId=10 returns filtered DS divisions")
    void shouldReturnDsDivisionsByDistrict() throws Exception {
        when(locationService.getDsDivisions(10L)).thenReturn(List.of(
                new DsDivisionDto(100L, "DS-COL-01", "Colombo", 10L, "Colombo", 6.9344, 79.8428)
        ));

        mockMvc.perform(get("/locations/ds-divisions").param("districtId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("DS-COL-01"))
                .andExpect(jsonPath("$[0].districtId").value(10L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /locations/gn-divisions?dsDivisionId=100 returns filtered GN divisions")
    void shouldReturnGnDivisionsByDsDivision() throws Exception {
        when(locationService.getGnDivisions(100L)).thenReturn(List.of(
                new GnDivisionDto(1000L, "GN-COL-001", "Fort", 100L, "Colombo", "00100", 500L, 6.9344, 79.8428)
        ));

        mockMvc.perform(get("/locations/gn-divisions").param("dsDivisionId", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("GN-COL-001"))
                .andExpect(jsonPath("$[0].postalCode").value("00100"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /locations/postal-areas supports filters and text/code search")
    void shouldSearchPostalAreasWithFilters() throws Exception {
        when(locationService.searchPostalAreas(1L, 10L, 100L, null, "Fort")).thenReturn(List.of(
                new PostalAreaDto(500L, "00100", "Colombo 01 - Fort", 1L, "Western", 10L, "Colombo", 100L, "Colombo", 6.9344, 79.8428, true)
        ));

        mockMvc.perform(get("/locations/postal-areas")
                        .param("provinceId", "1")
                        .param("districtId", "10")
                        .param("dsDivisionId", "100")
                        .param("search", "Fort"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].postalCode").value("00100"))
                .andExpect(jsonPath("$[0].areaName").value("Colombo 01 - Fort"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /locations/postal-areas supports gnDivisionId filter and /api/v1/locations dual mapping")
    void shouldSupportGnDivisionFilterAndApiV1DualMapping() throws Exception {
        when(locationService.searchPostalAreas(null, null, null, 1000L, null)).thenReturn(List.of(
                new PostalAreaDto(500L, "00100", "Colombo 01 - Fort", 1L, "Western", 10L, "Colombo", 100L, "Colombo", 6.9344, 79.8428, true)
        ));
        when(locationService.getProvinces()).thenReturn(List.of(
                new ProvinceDto(1L, "WP", "Western", 6.9271, 79.8612)
        ));

        mockMvc.perform(get("/locations/postal-areas").param("gnDivisionId", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].postalCode").value("00100"));

        mockMvc.perform(get("/api/v1/locations/provinces"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("WP"));
    }
}
