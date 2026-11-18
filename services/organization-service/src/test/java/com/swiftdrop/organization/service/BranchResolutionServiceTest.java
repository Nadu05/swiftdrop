package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchResolutionRequest;
import com.swiftdrop.organization.dto.BranchResolutionResponse;
import com.swiftdrop.organization.dto.RouteBranchResolutionRequest;
import com.swiftdrop.organization.dto.RouteBranchResolutionResponse;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.BranchPostalArea;
import com.swiftdrop.organization.entity.PostalArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.exception.UnsupportedServiceAreaException;
import com.swiftdrop.organization.repository.BranchPostalAreaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BranchResolutionServiceTest {

    @Mock
    private BranchPostalAreaRepository branchPostalAreaRepository;

    @InjectMocks
    private BranchResolutionService resolutionService;

    private Branch branchColombo;
    private Branch branchKandy;
    private PostalArea fort00100;
    private PostalArea kollupitiya00300;
    private PostalArea kandy20000;

    @BeforeEach
    void setUp() {
        branchColombo = new Branch();
        branchColombo.setId(1L);
        branchColombo.setCode("BR-COL-001");
        branchColombo.setName("Colombo Central Branch");
        branchColombo.setLatitude(6.9271);
        branchColombo.setLongitude(79.8612);
        branchColombo.setStatus(BranchStatus.ACTIVE);

        branchKandy = new Branch();
        branchKandy.setId(2L);
        branchKandy.setCode("BR-KAN-001");
        branchKandy.setName("Kandy City Branch");
        branchKandy.setLatitude(7.2906);
        branchKandy.setLongitude(80.6337);
        branchKandy.setStatus(BranchStatus.ACTIVE);

        fort00100 = new PostalArea();
        fort00100.setId(10L);
        fort00100.setPostalCode("00100");
        fort00100.setAreaName("Colombo 01 Fort");
        fort00100.setActive(true);

        kollupitiya00300 = new PostalArea();
        kollupitiya00300.setId(11L);
        kollupitiya00300.setPostalCode("00300");
        kollupitiya00300.setAreaName("Colombo 03 Kollupitiya");
        kollupitiya00300.setActive(true);

        kandy20000 = new PostalArea();
        kandy20000.setId(12L);
        kandy20000.setPostalCode("20000");
        kandy20000.setAreaName("Kandy");
        kandy20000.setActive(true);
    }

    @Test
    @DisplayName("Should resolve active branch strictly by postal code")
    void shouldResolveBranchByPostalCode() {
        BranchPostalArea assignment = activeAssignment(branchColombo, fort00100);
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("00100"))
                .thenReturn(Optional.of(assignment));

        BranchResolutionResponse response = resolutionService.resolveNearestBranch(new BranchResolutionRequest("00100"));

        assertThat(response.getBranchId()).isEqualTo(1L);
        assertThat(response.getBranchCode()).isEqualTo("BR-COL-001");
        assertThat(response.getBranchName()).isEqualTo("Colombo Central Branch");
        assertThat(response.isEligible()).isTrue();
    }

    @Test
    @DisplayName("Should throw UnsupportedServiceAreaException with PICKUP when postal code is uncovered")
    void shouldRejectUncoveredPostalCode() {
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("40000"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> resolutionService.resolveNearestBranch(new BranchResolutionRequest("40000")))
                .isInstanceOf(UnsupportedServiceAreaException.class)
                .satisfies(ex -> assertThat(((UnsupportedServiceAreaException) ex).getLocationType()).isEqualTo("PICKUP"));
    }

    @Test
    @DisplayName("Should resolve distinct origin and destination branches and compute interBranchDistanceKm")
    void shouldResolveDistinctBranchesAndInterBranchDistance() {
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("00100"))
                .thenReturn(Optional.of(activeAssignment(branchColombo, fort00100)));
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("20000"))
                .thenReturn(Optional.of(activeAssignment(branchKandy, kandy20000)));

        RouteBranchResolutionResponse response = resolutionService.resolveRoute(
                new RouteBranchResolutionRequest("00100", "20000")
        );

        assertThat(response.getOriginBranch().getBranchId()).isEqualTo(1L);
        assertThat(response.getDestinationBranch().getBranchId()).isEqualTo(2L);
        assertThat(response.isSameBranch()).isFalse();
        // Haversine distance between Colombo (6.9271, 79.8612) and Kandy (7.2906, 80.6337) is ~94.4 km
        assertThat(response.getInterBranchDistanceKm()).isBetween(90.0, 100.0);
    }

    @Test
    @DisplayName("Should set sameBranch=true and interBranchDistanceKm=0 when both postal codes map to same branch")
    void shouldResolveSameBranchRoute() {
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("00100"))
                .thenReturn(Optional.of(activeAssignment(branchColombo, fort00100)));
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("00300"))
                .thenReturn(Optional.of(activeAssignment(branchColombo, kollupitiya00300)));

        RouteBranchResolutionResponse response = resolutionService.resolveRoute(
                new RouteBranchResolutionRequest("00100", "00300")
        );

        assertThat(response.getOriginBranch().getBranchId()).isEqualTo(1L);
        assertThat(response.getDestinationBranch().getBranchId()).isEqualTo(1L);
        assertThat(response.isSameBranch()).isTrue();
        assertThat(response.getInterBranchDistanceKm()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should throw UnsupportedServiceAreaException with locationType PICKUP when pickup postal code is uncovered")
    void shouldRejectUncoveredPickupPostalCodeInRoute() {
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("99999"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> resolutionService.resolveRoute(new RouteBranchResolutionRequest("99999", "20000")))
                .isInstanceOf(UnsupportedServiceAreaException.class)
                .satisfies(ex -> assertThat(((UnsupportedServiceAreaException) ex).getLocationType()).isEqualTo("PICKUP"));
    }

    @Test
    @DisplayName("Should throw UnsupportedServiceAreaException with locationType DESTINATION when dropoff postal code is uncovered")
    void shouldRejectUncoveredDropoffPostalCodeInRoute() {
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("00100"))
                .thenReturn(Optional.of(activeAssignment(branchColombo, fort00100)));
        when(branchPostalAreaRepository.findActiveByPostalCodeAndActiveBranch("40000"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> resolutionService.resolveRoute(new RouteBranchResolutionRequest("00100", "40000")))
                .isInstanceOf(UnsupportedServiceAreaException.class)
                .satisfies(ex -> assertThat(((UnsupportedServiceAreaException) ex).getLocationType()).isEqualTo("DESTINATION"));
    }

    private BranchPostalArea activeAssignment(Branch branch, PostalArea postalArea) {
        BranchPostalArea bpa = new BranchPostalArea();
        bpa.setBranch(branch);
        bpa.setPostalArea(postalArea);
        bpa.setActive(true);
        return bpa;
    }
}
