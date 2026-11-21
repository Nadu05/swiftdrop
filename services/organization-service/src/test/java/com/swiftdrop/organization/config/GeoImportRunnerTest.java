package com.swiftdrop.organization.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.repository.DistrictRepository;
import com.swiftdrop.organization.repository.DsDivisionRepository;
import com.swiftdrop.organization.repository.GnDivisionRepository;
import com.swiftdrop.organization.repository.PostalAreaRepository;
import com.swiftdrop.organization.repository.ProvinceRepository;
import com.swiftdrop.organization.service.GeoImportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ResourceLoader;
import org.springframework.test.context.TestPropertySource;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:geo_import_runner_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false"
})
@Import({GeoImportRunner.class, GeoImportService.class, ObjectMapper.class})
class GeoImportRunnerTest {

    @Autowired
    private GeoImportRunner defaultProfileRunner;

    @Autowired
    private GeoImportService geoImportService;

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private DsDivisionRepository dsDivisionRepository;

    @Autowired
    private GnDivisionRepository gnDivisionRepository;

    @Autowired
    private PostalAreaRepository postalAreaRepository;

    @Autowired
    private ResourceLoader resourceLoader;

    @TempDir
    Path tempDir;

    private Path bundleFile;

    private static final String BUNDLE_JSON = """
            {
              "import_version": "2026.11.1",
              "provinces": [
                { "code": "WP", "name": "Western", "latitude": 6.9271, "longitude": 79.8612 }
              ],
              "districts": [
                { "code": "COL", "province_code": "WP", "name": "Colombo", "latitude": 6.9271, "longitude": 79.8612 }
              ],
              "ds_divisions": [
                { "code": "DS-COL-01", "district_code": "COL", "name": "Colombo", "latitude": 6.9344, "longitude": 79.8428 }
              ],
              "postal_areas": [
                {
                  "postal_code": "00100",
                  "area_name": "Colombo 01 - Fort",
                  "province_code": "WP",
                  "district_code": "COL",
                  "ds_division_code": "DS-COL-01",
                  "latitude": 6.9344,
                  "longitude": 79.8428,
                  "is_active": true,
                  "source_name": "slwdc/Postal-Codes",
                  "source_reference": "SriLankaPost-2026",
                  "import_version": "2026.11.1"
                }
              ],
              "gn_divisions": [
                {
                  "code": "GN-COL-001",
                  "ds_division_code": "DS-COL-01",
                  "name": "Fort",
                  "postal_code": "00100",
                  "latitude": 6.9344,
                  "longitude": 79.8428
                }
              ]
            }
            """;

    @BeforeEach
    void setUp() throws Exception {
        bundleFile = tempDir.resolve("sri-lanka-geo-bundle.json");
        Files.writeString(bundleFile, BUNDLE_JSON, StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("Auto-imports geographical dataset on default profile when provinces table is empty")
    void shouldAutoImportWhenProvincesTableIsEmpty() throws Exception {
        assertThat(defaultProfileRunner).isNotNull();
        assertThat(provinceRepository.count()).isZero();

        GeoImportRunner runner = new GeoImportRunner(
                geoImportService,
                provinceRepository,
                resourceLoader,
                bundleFile.toUri().toString(),
                false
        );

        runner.run();

        assertThat(provinceRepository.count()).isEqualTo(1);
        assertThat(districtRepository.count()).isEqualTo(1);
        assertThat(dsDivisionRepository.count()).isEqualTo(1);
        assertThat(postalAreaRepository.count()).isEqualTo(1);
        assertThat(gnDivisionRepository.count()).isEqualTo(1);
    }
}
