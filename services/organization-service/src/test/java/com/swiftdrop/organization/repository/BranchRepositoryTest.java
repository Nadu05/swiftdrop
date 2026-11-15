package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import com.swiftdrop.organization.service.BranchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(BranchService.class)
class BranchRepositoryTest {

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private ServiceAreaRepository serviceAreaRepository;

    @Autowired
    private BranchService branchService;

    @Test
    @DisplayName("Persists branch with audit timestamps and retrieves by code and existsByCode")
    void saveAndFindByCode_Success() {
        Branch branch = buildBranch("BR-COL-001", "Colombo Central", BranchStatus.ACTIVE);
        Branch saved = branchRepository.saveAndFlush(branch);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        Optional<Branch> found = branchRepository.findByCode("BR-COL-001");
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Colombo Central");
        assertThat(branchRepository.existsByCode("BR-COL-001")).isTrue();
        assertThat(branchRepository.existsByCode("BR-NONEXISTENT")).isFalse();
    }

    @Test
    @DisplayName("Enforces unique constraint on branch code")
    void save_DuplicateCode_ThrowsDataIntegrityViolation() {
        branchRepository.saveAndFlush(buildBranch("BR-DUP-001", "First Branch", BranchStatus.ACTIVE));

        Branch duplicate = buildBranch("BR-DUP-001", "Second Branch", BranchStatus.ACTIVE);

        assertThatThrownBy(() -> branchRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Filters branches by status and orders alphabetically by name")
    void findByStatusOrderByNameAsc_And_findAllByOrderByNameAsc() {
        branchRepository.save(buildBranch("BR-KDY-001", "Kandy Hub", BranchStatus.ACTIVE));
        branchRepository.save(buildBranch("BR-COL-001", "Colombo Hub", BranchStatus.ACTIVE));
        branchRepository.save(buildBranch("BR-GAL-001", "Galle Hub", BranchStatus.INACTIVE));
        branchRepository.flush();

        List<Branch> allBranches = branchRepository.findAllByOrderByNameAsc();
        assertThat(allBranches).extracting(Branch::getName)
                .containsExactly("Colombo Hub", "Galle Hub", "Kandy Hub");

        List<Branch> activeBranches = branchRepository.findByStatusOrderByNameAsc(BranchStatus.ACTIVE);
        assertThat(activeBranches).extracting(Branch::getName)
                .containsExactly("Colombo Hub", "Kandy Hub");

        List<Branch> inactiveBranches = branchRepository.findByStatusOrderByNameAsc(BranchStatus.INACTIVE);
        assertThat(inactiveBranches).extracting(Branch::getName)
                .containsExactly("Galle Hub");
    }

    @Test
    @DisplayName("BranchService.create persists both branch and one default 25.00 km service area in the same transaction")
    void branchServiceCreate_PersistsBranchAndDefault25KmServiceAreaTransactionally() {
        BranchCreateRequest request = new BranchCreateRequest(
                "CMB-CENTRAL",
                "Colombo Central Hub",
                "No. 45, Union Place",
                "Colombo 02",
                "Colombo",
                "+94 11 234 5678",
                "colombo.central@swiftdrop.lk",
                6.9218,
                79.8612
        );

        BranchResponse createdBranch = branchService.create(request);
        branchRepository.flush();
        serviceAreaRepository.flush();

        assertThat(createdBranch.getId()).isNotNull();

        List<ServiceArea> serviceAreas = serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(createdBranch.getId());
        assertThat(serviceAreas).hasSize(1);

        ServiceArea defaultArea = serviceAreas.get(0);
        assertThat(defaultArea.getBranch().getId()).isEqualTo(createdBranch.getId());
        assertThat(defaultArea.getCenterLatitude()).isEqualTo(6.9218);
        assertThat(defaultArea.getCenterLongitude()).isEqualTo(79.8612);
        assertThat(defaultArea.getMaxRadiusKm()).isEqualByComparingTo(new BigDecimal("25.00"));
        assertThat(defaultArea.getStatus()).isEqualTo(ServiceAreaStatus.ACTIVE);
        assertThat(defaultArea.getAreaName()).isEqualTo("Colombo Central Hub - 25 km Coverage Zone");
    }

    private Branch buildBranch(String code, String name, BranchStatus status) {
        Branch branch = new Branch();
        branch.setCode(code);
        branch.setName(name);
        branch.setAddressLine1("100 Main Road");
        branch.setCity("Colombo");
        branch.setPhone("+94112345678");
        branch.setEmail("branch@swiftdrop.lk");
        branch.setLatitude(6.9271);
        branch.setLongitude(79.8612);
        branch.setStatus(status);
        return branch;
    }
}

