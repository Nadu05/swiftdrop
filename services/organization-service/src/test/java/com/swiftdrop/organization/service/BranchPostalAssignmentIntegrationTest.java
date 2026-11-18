package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.entity.District;
import com.swiftdrop.organization.entity.DsDivision;
import com.swiftdrop.organization.entity.PostalArea;
import com.swiftdrop.organization.entity.Province;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.repository.BranchPostalAreaRepository;
import com.swiftdrop.organization.repository.BranchRepository;
import com.swiftdrop.organization.repository.DistrictRepository;
import com.swiftdrop.organization.repository.DsDivisionRepository;
import com.swiftdrop.organization.repository.PostalAreaRepository;
import com.swiftdrop.organization.repository.ProvinceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:branch_postal_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=true",
        "spring.flyway.url=jdbc:h2:mem:branch_postal_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.user=sa",
        "spring.flyway.password=",
        "spring.flyway.locations=classpath:db/migration"
})
@Import(BranchService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class BranchPostalAssignmentIntegrationTest {

    @Autowired
    private BranchService branchService;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private BranchPostalAreaRepository branchPostalAreaRepository;

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private DsDivisionRepository dsDivisionRepository;

    @Autowired
    private PostalAreaRepository postalAreaRepository;

    private Province western;
    private District colombo;
    private DsDivision colomboDs;
    private PostalArea fort00100;
    private PostalArea kollupitiya00300;

    @BeforeEach
    void setUp() {
        branchPostalAreaRepository.deleteAll();
        branchRepository.deleteAll();
        postalAreaRepository.deleteAll();
        dsDivisionRepository.deleteAll();
        districtRepository.deleteAll();
        provinceRepository.deleteAll();

        western = new Province();
        western.setCode("WP");
        western.setName("Western");
        western.setLatitude(6.9271);
        western.setLongitude(79.8612);
        western = provinceRepository.save(western);

        colombo = new District();
        colombo.setCode("COL");
        colombo.setName("Colombo");
        colombo.setProvince(western);
        colombo.setLatitude(6.9271);
        colombo.setLongitude(79.8612);
        colombo = districtRepository.save(colombo);

        colomboDs = new DsDivision();
        colomboDs.setCode("DS-COL-01");
        colomboDs.setName("Colombo");
        colomboDs.setDistrict(colombo);
        colomboDs.setLatitude(6.9344);
        colomboDs.setLongitude(79.8428);
        colomboDs = dsDivisionRepository.save(colomboDs);

        fort00100 = createPostalArea("00100", "Colombo 01 - Fort");
        kollupitiya00300 = createPostalArea("00300", "Colombo 03 - Kollupitiya");
    }

    private PostalArea createPostalArea(String code, String name) {
        PostalArea area = new PostalArea();
        area.setPostalCode(code);
        area.setAreaName(name);
        area.setProvince(western);
        area.setDistrict(colombo);
        area.setDsDivision(colomboDs);
        area.setLatitude(6.9344);
        area.setLongitude(79.8428);
        area.setActive(true);
        area.setSourceName("slwdc/Postal-Codes");
        area.setSourceReference("SriLankaPost-2026");
        area.setImportVersion("2026.11.1");
        return postalAreaRepository.save(area);
    }

    private BranchCreateRequest buildRequest(String code, String name, List<Long> postalAreaIds) {
        BranchCreateRequest request = new BranchCreateRequest(
                code,
                name,
                "123 Galle Road",
                "Suite 4",
                "Colombo",
                "+94112345678",
                code.toLowerCase() + "@swiftdrop.lk",
                6.9271,
                79.8612
        );
        request.setProvinceId(western.getId());
        request.setDistrictId(colombo.getId());
        request.setDsDivisionId(colomboDs.getId());
        request.setPostalCode("00100");
        request.setPostalAreaIds(postalAreaIds);
        return request;
    }

    @Test
    @DisplayName("Creates branch and active postal areas atomically, deduplicating repeated postalAreaIds")
    void shouldCreateBranchAndDeduplicatePostalAreaIds() {
        BranchCreateRequest request = buildRequest(
                "BR-COL-01",
                "Colombo Central",
                List.of(fort00100.getId(), fort00100.getId(), kollupitiya00300.getId())
        );

        BranchResponse response = branchService.create(request);

        assertThat(response.getId()).isNotNull();
        assertThat(response.getProvinceId()).isEqualTo(western.getId());
        assertThat(response.getDistrictId()).isEqualTo(colombo.getId());
        assertThat(response.getDsDivisionId()).isEqualTo(colomboDs.getId());
        assertThat(response.getPostalCode()).isEqualTo("00100");
        assertThat(response.getAssignedPostalAreas()).hasSize(2);
        assertThat(branchPostalAreaRepository.findByBranchIdAndIsActiveTrue(response.getId())).hasSize(2);
    }

    @Test
    @DisplayName("Rejects ACTIVE branch creation with zero assigned postal areas")
    void shouldRejectActiveBranchWithZeroPostalAreas() {
        BranchCreateRequest request = buildRequest("BR-EMPTY-01", "Empty Branch", List.of());

        assertThatThrownBy(() -> branchService.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least one");

        assertThat(branchRepository.existsByCode("BR-EMPTY-01")).isFalse();
    }

    @Test
    @DisplayName("Rolls back branch creation when a requested postal area is already actively assigned to another branch")
    void shouldRollbackOnPostalAreaConflict() {
        BranchCreateRequest firstBranch = buildRequest(
                "BR-FIRST",
                "Colombo North Hub",
                List.of(fort00100.getId())
        );
        branchService.create(firstBranch);

        BranchCreateRequest conflictingBranch = buildRequest(
                "BR-SECOND",
                "Colombo South Hub",
                List.of(kollupitiya00300.getId(), fort00100.getId())
        );

        assertThatThrownBy(() -> branchService.create(conflictingBranch))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("00100")
                .hasMessageContaining("Colombo North Hub");

        assertThat(branchRepository.existsByCode("BR-SECOND")).isFalse();
        assertThat(branchPostalAreaRepository.findByPostalAreaIdAndIsActiveTrue(kollupitiya00300.getId())).isEmpty();
    }
}
