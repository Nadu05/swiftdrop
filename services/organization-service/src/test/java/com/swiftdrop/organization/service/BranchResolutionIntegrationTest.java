package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
import com.swiftdrop.organization.dto.RouteBranchResolutionRequest;
import com.swiftdrop.organization.dto.RouteBranchResolutionResponse;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.BranchPostalArea;
import com.swiftdrop.organization.entity.District;
import com.swiftdrop.organization.entity.DsDivision;
import com.swiftdrop.organization.entity.PostalArea;
import com.swiftdrop.organization.entity.Province;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.exception.UnsupportedServiceAreaException;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:branch_resolution_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=true",
        "spring.flyway.url=jdbc:h2:mem:branch_resolution_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.user=sa",
        "spring.flyway.password=",
        "spring.flyway.locations=classpath:db/migration"
})
@Import(BranchResolutionService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class BranchResolutionIntegrationTest {

    @Autowired
    private BranchResolutionService resolutionService;

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
    private Branch activeColomboBranch;
    private Branch activeKandyBranch;
    private Branch inactiveBranch;

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
        western = provinceRepository.save(western);

        colombo = new District();
        colombo.setCode("COL");
        colombo.setName("Colombo");
        colombo.setProvince(western);
        colombo = districtRepository.save(colombo);

        colomboDs = new DsDivision();
        colomboDs.setCode("COL-DS");
        colomboDs.setName("Colombo");
        colomboDs.setDistrict(colombo);
        colomboDs = dsDivisionRepository.save(colomboDs);

        activeColomboBranch = createBranch("BR-COL-001", "Colombo Central", 6.9271, 79.8612, BranchStatus.ACTIVE);
        activeKandyBranch = createBranch("BR-KAN-001", "Kandy City", 7.2906, 80.6337, BranchStatus.ACTIVE);
        inactiveBranch = createBranch("BR-INA-001", "Inactive Branch", 6.0535, 80.2210, BranchStatus.INACTIVE);

        PostalArea fort00100 = createPostalArea("00100", "Colombo 01 Fort", true);
        PostalArea kandy20000 = createPostalArea("20000", "Kandy", true);
        PostalArea inactiveArea = createPostalArea("00999", "Inactive Area", false);
        PostalArea historicalOnlyArea = createPostalArea("00800", "Borella", true);
        PostalArea inactiveBranchArea = createPostalArea("80000", "Galle", true);

        assign(activeColomboBranch, fort00100, true);
        assign(activeKandyBranch, kandy20000, true);
        assign(activeColomboBranch, inactiveArea, true);
        assign(activeColomboBranch, historicalOnlyArea, false);
        assign(inactiveBranch, inactiveBranchArea, true);
    }

    @Test
    @DisplayName("Resolves active branch by postal code and computes interBranchDistanceKm")
    void resolvesActiveRouteByPostalCode() {
        RouteBranchResolutionResponse route = resolutionService.resolveRoute(
                new RouteBranchResolutionRequest("00100", "20000")
        );

        assertThat(route.getOriginBranch().getBranchCode()).isEqualTo("BR-COL-001");
        assertThat(route.getDestinationBranch().getBranchCode()).isEqualTo("BR-KAN-001");
        assertThat(route.isSameBranch()).isFalse();
        assertThat(route.getInterBranchDistanceKm()).isBetween(90.0, 100.0);
    }

    @Test
    @DisplayName("Rejects inactive postal area, historical-only assignment, and inactive branch with 422")
    void rejectsInactiveOrUnassignedCoverage() {
        assertThatThrownBy(() -> resolutionService.resolveNearestBranch(new BranchResolutionRequest("00999")))
                .isInstanceOf(UnsupportedServiceAreaException.class);

        assertThatThrownBy(() -> resolutionService.resolveNearestBranch(new BranchResolutionRequest("00800")))
                .isInstanceOf(UnsupportedServiceAreaException.class);

        assertThatThrownBy(() -> resolutionService.resolveNearestBranch(new BranchResolutionRequest("80000")))
                .isInstanceOf(UnsupportedServiceAreaException.class);

        assertThatThrownBy(() -> resolutionService.resolveNearestBranch(new BranchResolutionRequest("99999")))
                .isInstanceOf(UnsupportedServiceAreaException.class);
    }

    private Branch createBranch(String code, String name, double lat, double lng, BranchStatus status) {
        Branch b = new Branch();
        b.setCode(code);
        b.setName(name);
        b.setAddressLine1(name + " Road");
        b.setCity(name);
        b.setProvince(western);
        b.setDistrict(colombo);
        b.setDsDivision(colomboDs);
        b.setPostalCode("00100");
        b.setPhone("0112345678");
        b.setLatitude(lat);
        b.setLongitude(lng);
        b.setStatus(status);
        return branchRepository.save(b);
    }

    private PostalArea createPostalArea(String code, String name, boolean active) {
        PostalArea pa = new PostalArea();
        pa.setPostalCode(code);
        pa.setAreaName(name);
        pa.setProvince(western);
        pa.setDistrict(colombo);
        pa.setDsDivision(colomboDs);
        pa.setActive(active);
        pa.setSourceName("test");
        pa.setSourceReference("test");
        pa.setImportVersion("1.0");
        return postalAreaRepository.save(pa);
    }

    private void assign(Branch branch, PostalArea postalArea, boolean active) {
        BranchPostalArea bpa = new BranchPostalArea();
        bpa.setBranch(branch);
        bpa.setPostalArea(postalArea);
        bpa.setActive(active);
        bpa.setAssignedBy("admin@swiftdrop.lk");
        branchPostalAreaRepository.save(bpa);
    }
}
