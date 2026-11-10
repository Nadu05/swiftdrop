package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import com.swiftdrop.organization.exception.UnsupportedServiceAreaException;
import com.swiftdrop.organization.repository.ServiceAreaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BranchResolutionServiceTest {

    @Mock
    private ServiceAreaRepository serviceAreaRepository;

    @InjectMocks
    private BranchResolutionService resolutionService;

    private Branch branchColombo;
    private Branch branchDehiwala;
    private ServiceArea areaColombo;
    private ServiceArea areaDehiwala;

    @BeforeEach
    void setUp() {
        // Branch 1: Colombo Central
        // Branch coordinates: 6.9271, 79.8612
        branchColombo = new Branch();
        branchColombo.setId(1L);
        branchColombo.setCode("BR-COL-001");
        branchColombo.setName("Colombo Central Branch");
        branchColombo.setLatitude(6.9271);
        branchColombo.setLongitude(79.8612);
        branchColombo.setStatus(BranchStatus.ACTIVE);

        // Service Area 1: Center 6.9271, 79.8612, Radius 10 km
        areaColombo = new ServiceArea();
        areaColombo.setId(101L);
        areaColombo.setBranch(branchColombo);
        areaColombo.setAreaName("Colombo Metro Area");
        areaColombo.setCenterLatitude(6.9271);
        areaColombo.setCenterLongitude(79.8612);
        areaColombo.setMaxRadiusKm(new BigDecimal("10.00"));
        areaColombo.setStatus(ServiceAreaStatus.ACTIVE);

        // Branch 2: Dehiwala Branch
        // Branch coordinates: 6.8511, 79.8653 (approx 8.4 km South of Colombo)
        branchDehiwala = new Branch();
        branchDehiwala.setId(2L);
        branchDehiwala.setCode("BR-DEH-002");
        branchDehiwala.setName("Dehiwala Branch");
        branchDehiwala.setLatitude(6.8511);
        branchDehiwala.setLongitude(79.8653);
        branchDehiwala.setStatus(BranchStatus.ACTIVE);

        // Service Area 2: Center 6.8511, 79.8653, Radius 8 km
        areaDehiwala = new ServiceArea();
        areaDehiwala.setId(102L);
        areaDehiwala.setBranch(branchDehiwala);
        areaDehiwala.setAreaName("Dehiwala-Mount Lavinia Area");
        areaDehiwala.setCenterLatitude(6.8511);
        areaDehiwala.setCenterLongitude(79.8653);
        areaDehiwala.setMaxRadiusKm(new BigDecimal("8.00"));
        areaDehiwala.setStatus(ServiceAreaStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should resolve eligible branch when location falls inside its service area")
    void shouldResolveBranchSuccessfully() {
        // Pickup in Kollupitiya: 6.9150, 79.8550 (approx 1.5 km from Colombo Branch)
        BranchResolutionRequest request = new BranchResolutionRequest(6.9150, 79.8550);

        when(serviceAreaRepository.findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE))
                .thenReturn(List.of(areaColombo));

        BranchResolutionResponse response = resolutionService.resolveNearestBranch(request);

        assertThat(response).isNotNull();
        assertThat(response.getBranchId()).isEqualTo(1L);
        assertThat(response.getBranchCode()).isEqualTo("BR-COL-001");
        assertThat(response.getBranchName()).isEqualTo("Colombo Central Branch");
        assertThat(response.isEligible()).isTrue();
        assertThat(response.getDistanceKm()).isGreaterThan(0.0);
    }

    @Test
    @DisplayName("Should select the nearest eligible branch when multiple service areas cover the pickup location")
    void shouldSelectNearestBranchWhenMultipleQualify() {
        // Pickup in Wellawatte: 6.8730, 79.8600
        // Distance to Colombo center (6.9271, 79.8612) is ~6 km (covered by areaColombo: radius 10 km)
        // Distance to Dehiwala center (6.8511, 79.8653) is ~2.5 km (covered by areaDehiwala: radius 8 km)
        // Distance to branch Colombo: ~6.0 km
        // Distance to branch Dehiwala: ~2.5 km
        // Winner must be Dehiwala (branch 2) because it is geographically closer!
        BranchResolutionRequest request = new BranchResolutionRequest(6.8730, 79.8600);

        when(serviceAreaRepository.findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE))
                .thenReturn(List.of(areaColombo, areaDehiwala));

        BranchResolutionResponse response = resolutionService.resolveNearestBranch(request);

        assertThat(response.getBranchId()).isEqualTo(2L);
        assertThat(response.getBranchCode()).isEqualTo("BR-DEH-002");
        assertThat(response.getBranchName()).isEqualTo("Dehiwala Branch");
    }

    @Test
    @DisplayName("Should reject unsupported pickup locations with UnsupportedServiceAreaException (422)")
    void shouldRejectUnsupportedPickupLocation() {
        // Pickup in Kandy: 7.2906, 80.6337 (~95 km from Colombo and Dehiwala)
        BranchResolutionRequest request = new BranchResolutionRequest(7.2906, 80.6337);

        when(serviceAreaRepository.findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE))
                .thenReturn(List.of(areaColombo, areaDehiwala));

        assertThatThrownBy(() -> resolutionService.resolveNearestBranch(request))
                .isInstanceOf(UnsupportedServiceAreaException.class)
                .hasMessageContaining("not supported by any active branch service area");
    }

    @Test
    @DisplayName("Should throw UnsupportedServiceAreaException when no active service areas exist in system")
    void shouldThrowWhenNoActiveServiceAreas() {
        BranchResolutionRequest request = new BranchResolutionRequest(6.9271, 79.8612);

        when(serviceAreaRepository.findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE))
                .thenReturn(List.of());

        assertThatThrownBy(() -> resolutionService.resolveNearestBranch(request))
                .isInstanceOf(UnsupportedServiceAreaException.class);
    }

    @Test
    @DisplayName("Should resolve ties deterministically using lower branch ID")
    void shouldResolveTiesUsingBranchId() {
        // Create two branches equidistant from pickup location
        // Pickup at (0.0, 0.0)
        // Branch 10 at (1.0, 0.0), Service Area at (0.0, 0.0) with radius 1000 km
        // Branch 5 at (1.0, 0.0), Service Area at (0.0, 0.0) with radius 1000 km
        Branch b10 = new Branch();
        b10.setId(10L);
        b10.setCode("BR-10");
        b10.setName("Branch Ten");
        b10.setLatitude(1.0);
        b10.setLongitude(0.0);
        b10.setStatus(BranchStatus.ACTIVE);

        ServiceArea sa10 = new ServiceArea();
        sa10.setId(210L);
        sa10.setBranch(b10);
        sa10.setCenterLatitude(0.0);
        sa10.setCenterLongitude(0.0);
        sa10.setMaxRadiusKm(new BigDecimal("1000.00"));
        sa10.setStatus(ServiceAreaStatus.ACTIVE);

        Branch b5 = new Branch();
        b5.setId(5L);
        b5.setCode("BR-05");
        b5.setName("Branch Five");
        b5.setLatitude(1.0);
        b5.setLongitude(0.0);
        b5.setStatus(BranchStatus.ACTIVE);

        ServiceArea sa5 = new ServiceArea();
        sa5.setId(205L);
        sa5.setBranch(b5);
        sa5.setCenterLatitude(0.0);
        sa5.setCenterLongitude(0.0);
        sa5.setMaxRadiusKm(new BigDecimal("1000.00"));
        sa5.setStatus(ServiceAreaStatus.ACTIVE);

        BranchResolutionRequest request = new BranchResolutionRequest(0.0, 0.0);

        when(serviceAreaRepository.findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE))
                .thenReturn(List.of(sa10, sa5));

        BranchResolutionResponse response = resolutionService.resolveNearestBranch(request);

        // Branch 5 has lower ID than 10, so it must win the tie
        assertThat(response.getBranchId()).isEqualTo(5L);
        assertThat(response.getBranchCode()).isEqualTo("BR-05");
    }

    @Test
    @DisplayName("Should evaluate a branch only once even if it has multiple matching service areas")
    void shouldAvoidDuplicateBranchCandidates() {
        // Branch Colombo with two overlapping active service areas
        ServiceArea area2Colombo = new ServiceArea();
        area2Colombo.setId(103L);
        area2Colombo.setBranch(branchColombo);
        area2Colombo.setAreaName("Colombo Port & Commercial");
        area2Colombo.setCenterLatitude(6.9350);
        area2Colombo.setCenterLongitude(79.8500);
        area2Colombo.setMaxRadiusKm(new BigDecimal("10.00"));
        area2Colombo.setStatus(ServiceAreaStatus.ACTIVE);

        BranchResolutionRequest request = new BranchResolutionRequest(6.9271, 79.8612);

        when(serviceAreaRepository.findActiveServiceAreasForActiveBranches(ServiceAreaStatus.ACTIVE, BranchStatus.ACTIVE))
                .thenReturn(List.of(areaColombo, area2Colombo));

        BranchResolutionResponse response = resolutionService.resolveNearestBranch(request);

        assertThat(response.getBranchId()).isEqualTo(1L);
        assertThat(response.getBranchCode()).isEqualTo("BR-COL-001");
    }
}

