package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.ServiceAreaCreateRequest;
import com.swiftdrop.organization.dto.ServiceAreaResponse;
import com.swiftdrop.organization.dto.ServiceAreaUpdateRequest;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.BranchRepository;
import com.swiftdrop.organization.repository.ServiceAreaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ServiceAreaServiceTest {

    @Mock
    private ServiceAreaRepository serviceAreaRepository;

    @Mock
    private BranchRepository branchRepository;

    @InjectMocks
    private ServiceAreaService service;

    private Branch sampleBranch;
    private ServiceArea sampleServiceArea;

    @BeforeEach
    void setUp() {
        sampleBranch = new Branch();
        sampleBranch.setId(1L);
        sampleBranch.setCode("BR-COL-001");
        sampleBranch.setName("Colombo Branch");
        sampleBranch.setAddressLine1("123 Galle Rd");
        sampleBranch.setCity("Colombo");
        sampleBranch.setPhone("+94112345678");
        sampleBranch.setLatitude(6.9271);
        sampleBranch.setLongitude(79.8612);
        sampleBranch.setStatus(BranchStatus.ACTIVE);

        sampleServiceArea = new ServiceArea();
        sampleServiceArea.setId(10L);
        sampleServiceArea.setBranch(sampleBranch);
        sampleServiceArea.setAreaName("Colombo Central & Kollupitiya");
        sampleServiceArea.setCenterLatitude(6.9200);
        sampleServiceArea.setCenterLongitude(79.8600);
        sampleServiceArea.setMaxRadiusKm(new BigDecimal("15.00"));
        sampleServiceArea.setStatus(ServiceAreaStatus.ACTIVE);
        sampleServiceArea.setCreatedAt(LocalDateTime.now());
        sampleServiceArea.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should successfully create a service area for an existing branch")
    void shouldCreateServiceArea() {
        ServiceAreaCreateRequest request = new ServiceAreaCreateRequest(
                1L,
                "Colombo Central & Kollupitiya",
                6.9200,
                79.8600,
                new BigDecimal("15.00")
        );

        when(branchRepository.findById(1L)).thenReturn(Optional.of(sampleBranch));
        when(serviceAreaRepository.save(any(ServiceArea.class))).thenReturn(sampleServiceArea);

        ServiceAreaResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getBranchId()).isEqualTo(1L);
        assertThat(response.getBranchCode()).isEqualTo("BR-COL-001");
        assertThat(response.getAreaName()).isEqualTo("Colombo Central & Kollupitiya");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        verify(serviceAreaRepository, times(1)).save(any(ServiceArea.class));
    }

    @Test
    @DisplayName("Should reject service area creation when branch does not exist")
    void shouldRejectWhenBranchNotFound() {
        ServiceAreaCreateRequest request = new ServiceAreaCreateRequest(
                999L,
                "Nonexistent Area",
                6.9200,
                79.8600,
                new BigDecimal("10.00")
        );

        when(branchRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Branch not found with id: 999");

        verify(serviceAreaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should retrieve all service areas")
    void shouldRetrieveAllServiceAreas() {
        when(serviceAreaRepository.findAllByOrderByAreaNameAsc()).thenReturn(List.of(sampleServiceArea));

        List<ServiceAreaResponse> responses = service.findAll(null);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getAreaName()).isEqualTo("Colombo Central & Kollupitiya");
    }

    @Test
    @DisplayName("Should filter service areas by status")
    void shouldFilterServiceAreasByStatus() {
        when(serviceAreaRepository.findByStatusOrderByAreaNameAsc(ServiceAreaStatus.ACTIVE))
                .thenReturn(List.of(sampleServiceArea));

        List<ServiceAreaResponse> responses = service.findAll(ServiceAreaStatus.ACTIVE);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Should retrieve service areas by branch ID")
    void shouldFindByBranchId() {
        when(branchRepository.existsById(1L)).thenReturn(true);
        when(serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(1L)).thenReturn(List.of(sampleServiceArea));

        List<ServiceAreaResponse> responses = service.findByBranchId(1L, null);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getBranchId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Should throw 404 when retrieving service areas for nonexistent branch")
    void shouldThrowWhenFindByBranchIdNonexistent() {
        when(branchRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> service.findByBranchId(999L, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Branch not found with id: 999");
    }

    @Test
    @DisplayName("Should retrieve service area by ID")
    void shouldFindById() {
        when(serviceAreaRepository.findById(10L)).thenReturn(Optional.of(sampleServiceArea));

        ServiceAreaResponse response = service.findById(10L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("Should throw 404 for nonexistent service area ID")
    void shouldThrowNotFoundForNonexistentId() {
        when(serviceAreaRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("ServiceArea not found with id: 999");
    }

    @Test
    @DisplayName("Should partially update service area details")
    void shouldPartiallyUpdateServiceArea() {
        ServiceAreaUpdateRequest updateRequest = new ServiceAreaUpdateRequest();
        updateRequest.setAreaName("Colombo North");
        updateRequest.setMaxRadiusKm(new BigDecimal("20.00"));

        when(serviceAreaRepository.findById(10L)).thenReturn(Optional.of(sampleServiceArea));
        when(serviceAreaRepository.save(any(ServiceArea.class))).thenAnswer(i -> i.getArgument(0));

        ServiceAreaResponse response = service.update(10L, updateRequest);

        assertThat(response.getAreaName()).isEqualTo("Colombo North");
        assertThat(response.getMaxRadiusKm()).isEqualTo(new BigDecimal("20.00"));
        assertThat(response.getCenterLatitude()).isEqualTo(6.9200); // Unchanged
    }

    @Test
    @DisplayName("Should deactivate and reactivate service area")
    void shouldDeactivateAndReactivateServiceArea() {
        ServiceAreaUpdateRequest deactivateRequest = new ServiceAreaUpdateRequest();
        deactivateRequest.setStatus("INACTIVE");

        when(serviceAreaRepository.findById(10L)).thenReturn(Optional.of(sampleServiceArea));
        when(serviceAreaRepository.save(any(ServiceArea.class))).thenAnswer(i -> i.getArgument(0));

        ServiceAreaResponse response = service.update(10L, deactivateRequest);
        assertThat(response.getStatus()).isEqualTo("INACTIVE");

        // Reactivate
        ServiceAreaUpdateRequest reactivateRequest = new ServiceAreaUpdateRequest();
        reactivateRequest.setStatus("ACTIVE");
        response = service.update(10L, reactivateRequest);
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Should reject update with zero or negative radius")
    void shouldRejectZeroOrNegativeRadiusOnUpdate() {
        ServiceAreaUpdateRequest request = new ServiceAreaUpdateRequest();
        request.setMaxRadiusKm(new BigDecimal("-5.00"));

        when(serviceAreaRepository.findById(10L)).thenReturn(Optional.of(sampleServiceArea));

        assertThatThrownBy(() -> service.update(10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Maximum radius must be greater than zero");
    }

    @Test
    @DisplayName("Should reject update with invalid status string")
    void shouldRejectInvalidStatusString() {
        ServiceAreaUpdateRequest request = new ServiceAreaUpdateRequest();
        request.setStatus("INVALID_STATUS");

        when(serviceAreaRepository.findById(10L)).thenReturn(Optional.of(sampleServiceArea));

        assertThatThrownBy(() -> service.update(10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid service area status: 'INVALID_STATUS'");
    }
}

