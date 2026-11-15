package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceUnitUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class ServiceAreaRepositoryTest {

    @Autowired
    private ServiceAreaRepository serviceAreaRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private EntityManager entityManager;

    private Branch colomboBranch;
    private Branch kandyBranch;
    private ServiceArea colomboCentral;

    @BeforeEach
    void setUp() {
        colomboBranch = createBranch("BR-COL-001", "Colombo Central Branch", "Colombo", 6.9271, 79.8612, BranchStatus.ACTIVE);
        kandyBranch = createBranch("BR-KDY-001", "Kandy Regional Branch", "Kandy", 7.2906, 80.6337, BranchStatus.ACTIVE);

        colomboCentral = createServiceArea(colomboBranch, "Colombo Central", 6.9271, 79.8612, "15.00", ServiceAreaStatus.ACTIVE);
        createServiceArea(colomboBranch, "Colombo South", 6.8649, 79.8612, "10.00", ServiceAreaStatus.INACTIVE);
        createServiceArea(kandyBranch, "Kandy City", 7.2906, 80.6337, "12.00", ServiceAreaStatus.ACTIVE);

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("findAllByOrderByAreaNameAsc eagerly loads parent branch via @EntityGraph without N+1 queries")
    void findAllByOrderByAreaNameAsc_FetchesBranchWithEntityGraph() {
        PersistenceUnitUtil unitUtil = entityManager.getEntityManagerFactory().getPersistenceUnitUtil();

        List<ServiceArea> areas = serviceAreaRepository.findAllByOrderByAreaNameAsc();

        assertThat(areas).hasSize(3);
        assertThat(areas).extracting(ServiceArea::getAreaName)
                .containsExactly("Colombo Central", "Colombo South", "Kandy City");

        for (ServiceArea area : areas) {
            assertThat(unitUtil.isLoaded(area, "branch")).isTrue();
            assertThat(area.getBranch().getCode()).isNotBlank();
            assertThat(area.getBranch().getName()).isNotBlank();
        }
    }

    @Test
    @DisplayName("findByStatusOrderByAreaNameAsc eagerly loads parent branch via @EntityGraph")
    void findByStatusOrderByAreaNameAsc_FetchesBranchWithEntityGraph() {
        PersistenceUnitUtil unitUtil = entityManager.getEntityManagerFactory().getPersistenceUnitUtil();

        List<ServiceArea> activeAreas = serviceAreaRepository.findByStatusOrderByAreaNameAsc(ServiceAreaStatus.ACTIVE);

        assertThat(activeAreas).hasSize(2);
        assertThat(activeAreas).extracting(ServiceArea::getAreaName)
                .containsExactly("Colombo Central", "Kandy City");

        for (ServiceArea area : activeAreas) {
            assertThat(unitUtil.isLoaded(area, "branch")).isTrue();
            assertThat(area.getBranch().getName()).isNotBlank();
        }
    }

    @Test
    @DisplayName("findByBranchIdOrderByAreaNameAsc and findByBranchIdAndStatusOrderByAreaNameAsc eagerly load branch via @EntityGraph")
    void findByBranchIdQueries_FetchBranchWithEntityGraph() {
        PersistenceUnitUtil unitUtil = entityManager.getEntityManagerFactory().getPersistenceUnitUtil();

        List<ServiceArea> allForColombo = serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(colomboBranch.getId());
        assertThat(allForColombo).hasSize(2);
        allForColombo.forEach(sa -> assertThat(unitUtil.isLoaded(sa, "branch")).isTrue());

        entityManager.clear();

        List<ServiceArea> activeForColombo = serviceAreaRepository
                .findByBranchIdAndStatusOrderByAreaNameAsc(colomboBranch.getId(), ServiceAreaStatus.ACTIVE);
        assertThat(activeForColombo).hasSize(1);
        assertThat(unitUtil.isLoaded(activeForColombo.get(0), "branch")).isTrue();
        assertThat(activeForColombo.get(0).getBranch().getCode()).isEqualTo("BR-COL-001");
    }

    @Test
    @DisplayName("findById eagerly loads parent branch via @EntityGraph")
    void findById_FetchesBranchWithEntityGraph() {
        PersistenceUnitUtil unitUtil = entityManager.getEntityManagerFactory().getPersistenceUnitUtil();

        Optional<ServiceArea> found = serviceAreaRepository.findById(colomboCentral.getId());

        assertThat(found).isPresent();
        assertThat(unitUtil.isLoaded(found.get(), "branch")).isTrue();
        assertThat(found.get().getBranch().getCode()).isEqualTo("BR-COL-001");
    }

    @Test
    @DisplayName("findActiveServiceAreasForActiveBranches custom JPQL returns only ACTIVE areas under ACTIVE branches with JOIN FETCH")
    void findActiveServiceAreasForActiveBranches_FiltersBothStatusesAndFetchesBranch() {
        Branch inactiveGalleBranch = createBranch(
                "BR-GAL-001", "Galle Branch", "Galle", 6.0535, 80.2210, BranchStatus.INACTIVE);
        createServiceArea(inactiveGalleBranch, "Galle Fort", 6.0535, 80.2210, "8.00", ServiceAreaStatus.ACTIVE);
        entityManager.flush();
        entityManager.clear();

        PersistenceUnitUtil unitUtil = entityManager.getEntityManagerFactory().getPersistenceUnitUtil();

        List<ServiceArea> eligible = serviceAreaRepository.findActiveServiceAreasForActiveBranches(
                ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE);

        // Excludes Colombo South (INACTIVE service area) and Galle Fort (INACTIVE parent branch)
        assertThat(eligible).hasSize(2);
        assertThat(eligible).extracting(ServiceArea::getAreaName)
                .containsExactlyInAnyOrder("Colombo Central", "Kandy City");

        for (ServiceArea area : eligible) {
            assertThat(unitUtil.isLoaded(area, "branch")).isTrue();
            assertThat(area.getStatus()).isEqualTo(ServiceAreaStatus.ACTIVE);
            assertThat(area.getBranch().getStatus()).isEqualTo(BranchStatus.ACTIVE);
        }
    }

    private Branch createBranch(String code, String name, String city, double lat, double lon, BranchStatus status) {
        Branch branch = new Branch();
        branch.setCode(code);
        branch.setName(name);
        branch.setAddressLine1("10 Main Street");
        branch.setCity(city);
        branch.setPhone("+94112345678");
        branch.setLatitude(lat);
        branch.setLongitude(lon);
        branch.setStatus(status);
        return branchRepository.save(branch);
    }

    private ServiceArea createServiceArea(Branch branch, String areaName, double lat, double lon,
                                          String radiusKm, ServiceAreaStatus status) {
        ServiceArea sa = new ServiceArea();
        sa.setBranch(branch);
        sa.setAreaName(areaName);
        sa.setCenterLatitude(lat);
        sa.setCenterLongitude(lon);
        sa.setMaxRadiusKm(new BigDecimal(radiusKm));
        sa.setStatus(status);
        return serviceAreaRepository.save(sa);
    }
}

