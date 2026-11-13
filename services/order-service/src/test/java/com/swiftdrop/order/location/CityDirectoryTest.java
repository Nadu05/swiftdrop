package com.swiftdrop.order.location;

import com.swiftdrop.order.exception.BusinessRuleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CityDirectoryTest {

    private final CityDirectory directory = new CityDirectory();

    private static CityDirectory fromText(String csv) {
        return new CityDirectory(new ByteArrayResource(csv.getBytes(StandardCharsets.UTF_8)));
    }

    // ------------------------------------------------------------------ the shipped data file

    @Test
    @DisplayName("the shipped list has at least 25 towns across many districts")
    void enoughTowns() {
        assertThat(directory.all()).hasSizeGreaterThanOrEqualTo(25);
        assertThat(directory.all().stream().map(City::district).distinct().count()).isGreaterThanOrEqualTo(20);
    }

    @Test
    @DisplayName("every shipped town is inside Sri Lanka (catches mistyped or swapped coordinates)")
    void coordinatesAreInSriLanka() {
        for (City city : directory.all()) {
            assertThat(city.latitude()).as(city.code() + " latitude").isBetween(5.8, 9.9);
            assertThat(city.longitude()).as(city.code() + " longitude").isBetween(79.5, 82.0);
        }
    }

    @Test
    @DisplayName("every shipped town has a code, name and district")
    void completeRows() {
        for (City city : directory.all()) {
            assertThat(city.code()).matches("^[A-Z0-9_]{2,40}$");
            assertThat(city.name()).isNotBlank();
            assertThat(city.district()).isNotBlank();
        }
    }

    @Test
    @DisplayName("towns that must be separated by distance are not accidentally identical")
    void notDuplicatedLocations() {
        City colombo = directory.require("COLOMBO");
        City kandy = directory.require("KANDY");
        assertThat(DistanceCalculator.haversineKm(colombo.latitude(), colombo.longitude(),
                kandy.latitude(), kandy.longitude())).isBetween(90.0, 100.0);
    }

    @Test
    @DisplayName("all() is sorted by display name")
    void sortedByName() {
        List<String> names = directory.all().stream().map(City::name).toList();

        assertThat(names).isSorted();
    }

    // ------------------------------------------------------------------ lookup

    @Test
    @DisplayName("lookup ignores case and surrounding spaces")
    void lookupIsForgiving() {
        assertThat(directory.find("kandy")).map(City::code).contains("KANDY");
        assertThat(directory.find("  Kandy ")).map(City::code).contains("KANDY");
    }

    @Test
    @DisplayName("an unknown or missing code is not found; require() reports a business-rule error")
    void unknownCode() {
        assertThat(directory.find("ATLANTIS")).isEmpty();
        assertThat(directory.find(null)).isEmpty();
        assertThat(directory.find("")).isEmpty();
        assertThatThrownBy(() -> directory.require("ATLANTIS")).isInstanceOf(BusinessRuleException.class);
    }

    // ------------------------------------------------------------------ the file is validated at startup

    private static final String HEADER = "code,name,district,latitude,longitude\n";

    @Test
    @DisplayName("comments, blank lines and the header are skipped")
    void parsesCommentsAndHeader() {
        CityDirectory small = fromText("# note\n\n" + HEADER + "AAA,Alpha Town,North,7.0,80.0\n");

        assertThat(small.all()).hasSize(1);
        assertThat(small.require("AAA").name()).isEqualTo("Alpha Town");
    }

    @Test
    @DisplayName("a duplicate code stops startup")
    void duplicateCode() {
        assertThatThrownBy(() -> fromText(HEADER + "AAA,A,N,7.0,80.0\nAAA,B,N,7.1,80.1\n"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Duplicate");
    }

    @Test
    @DisplayName("out-of-range coordinates stop startup")
    void outOfRange() {
        assertThatThrownBy(() -> fromText(HEADER + "AAA,A,N,97.0,80.0\n"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("out-of-range");
    }

    @Test
    @DisplayName("a non-numeric coordinate stops startup")
    void nonNumeric() {
        assertThatThrownBy(() -> fromText(HEADER + "AAA,A,N,seven,80.0\n"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("non-numeric");
    }

    @Test
    @DisplayName("a row with the wrong number of columns stops startup")
    void wrongColumns() {
        assertThatThrownBy(() -> fromText(HEADER + "AAA,A,N,7.0\n"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("5 columns");
    }

    @Test
    @DisplayName("an invalid code (lower case or spaces) stops startup")
    void invalidCode() {
        assertThatThrownBy(() -> fromText(HEADER + "bad code,A,N,7.0,80.0\n"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("invalid code");
    }

    @Test
    @DisplayName("an empty list stops startup")
    void emptyList() {
        assertThatThrownBy(() -> fromText("# only comments\n" + HEADER))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("empty");
    }
}
