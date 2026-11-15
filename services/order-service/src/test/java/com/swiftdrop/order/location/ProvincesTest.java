package com.swiftdrop.order.location;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class ProvincesTest {

    @Test
    @DisplayName("every district of the shipped town list belongs to a province")
    void everyShippedDistrictHasAProvince() {
        for (City city : new CityDirectory().all()) {
            assertThat(Provinces.of(city)).as("province of %s (%s)", city.name(), city.district()).isNotNull();
        }
    }

    @Test
    @DisplayName("the shipped towns cover all nine provinces")
    void coversNineProvinces() {
        Set<String> provinces = new CityDirectory().all().stream().map(Provinces::of).collect(Collectors.toSet());
        assertThat(provinces).containsExactlyInAnyOrder("Western", "Central", "Southern", "Northern", "Eastern",
                "North Western", "North Central", "Uva", "Sabaragamuwa");
    }

    @Test
    @DisplayName("looks a province up by district and tolerates surrounding spaces")
    void lookup() {
        assertThat(Provinces.of(" Kandy ")).contains("Central");
        assertThat(Provinces.of("Nuwara Eliya")).contains("Central");
        assertThat(Provinces.of("Atlantis")).isEmpty();
        assertThat(Provinces.of((String) null)).isEmpty();
    }
}
