package com.swiftdrop.organization.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.PostalArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.repository.BranchRepository;
import com.swiftdrop.organization.repository.DistrictRepository;
import com.swiftdrop.organization.repository.DsDivisionRepository;
import com.swiftdrop.organization.repository.GnDivisionRepository;
import com.swiftdrop.organization.repository.PostalAreaRepository;
import com.swiftdrop.organization.repository.ProvinceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import java.nio.charset.StandardCharsets;
import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:geo_import_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=true",
        "spring.flyway.url=jdbc:h2:mem:geo_import_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.user=sa",
        "spring.flyway.password=",
        "spring.flyway.locations=classpath:db/migration"
})
@Import({GeoImportService.class, ObjectMapper.class})
class GeoImportServiceTest {

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
    private BranchRepository branchRepository;

    private static final String BUNDLE_V1 = """
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

    private static final String BUNDLE_V2 = """
            {
              "import_version": "2026.11.2",
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
                  "area_name": "Colombo 01 - Fort Updated",
                  "province_code": "WP",
                  "district_code": "COL",
                  "ds_division_code": "DS-COL-01",
                  "latitude": 6.9344,
                  "longitude": 79.8428,
                  "is_active": true,
                  "source_name": "slwdc/Postal-Codes",
                  "source_reference": "SriLankaPost-2026",
                  "import_version": "2026.11.2"
                },
                {
                  "postal_code": "00300",
                  "area_name": "Colombo 03 - Kollupitiya",
                  "province_code": "WP",
                  "district_code": "COL",
                  "ds_division_code": "DS-COL-01",
                  "latitude": 6.9110,
                  "longitude": 79.8500,
                  "is_active": true,
                  "source_name": "slwdc/Postal-Codes",
                  "source_reference": "SriLankaPost-2026",
                  "import_version": "2026.11.2"
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

    @Test
    @DisplayName("Idempotently imports geographical reference data and preserves existing branches")
    void shouldImportIdempotentlyAndPreserveExistingBranches() throws Exception {
        Branch existingBranch = new Branch();
        existingBranch.setCode("BR-COL-TEST");
        existingBranch.setName("Colombo Test Branch");
        existingBranch.setAddressLine1("100 Galle Rd");
        existingBranch.setCity("Colombo");
        existingBranch.setPhone("+94112000000");
        existingBranch.setLatitude(6.9271);
        existingBranch.setLongitude(79.8612);
        existingBranch.setStatus(BranchStatus.ACTIVE);
        branchRepository.saveAndFlush(existingBranch);

        geoImportService.importBundle(new ByteArrayInputStream(BUNDLE_V1.getBytes(StandardCharsets.UTF_8)));

        assertThat(provinceRepository.count()).isEqualTo(1);
        assertThat(districtRepository.count()).isEqualTo(1);
        assertThat(dsDivisionRepository.count()).isEqualTo(1);
        assertThat(gnDivisionRepository.count()).isEqualTo(1);
        assertThat(postalAreaRepository.count()).isEqualTo(1);

        // Re-import V2: updates 00100, inserts 00300, no duplicates, branch preserved
        geoImportService.importBundle(new ByteArrayInputStream(BUNDLE_V2.getBytes(StandardCharsets.UTF_8)));

        assertThat(provinceRepository.count()).isEqualTo(1);
        assertThat(districtRepository.count()).isEqualTo(1);
        assertThat(dsDivisionRepository.count()).isEqualTo(1);
        assertThat(gnDivisionRepository.count()).isEqualTo(1);
        assertThat(postalAreaRepository.count()).isEqualTo(2);

        PostalArea fort = postalAreaRepository.findByPostalCode("00100").orElseThrow();
        assertThat(fort.getAreaName()).isEqualTo("Colombo 01 - Fort Updated");
        assertThat(fort.getImportVersion()).isEqualTo("2026.11.2");
        assertThat(fort.isActive()).isTrue();

        assertThat(branchRepository.findByCode("BR-COL-TEST")).isPresent();
    }
}
