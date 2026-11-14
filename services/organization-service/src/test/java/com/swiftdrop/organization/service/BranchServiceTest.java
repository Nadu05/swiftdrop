package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.dto.BranchUpdateRequest;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.BranchRepository;
import com.swiftdrop.organization.repository.ServiceAreaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BranchServiceTest {

    @Mock
    private BranchRepository repository;

    @Mock
    private ServiceAreaRepository serviceAreaRepository;

    private BranchService service;

    private Branch sampleBranch;

    @BeforeEach
    void setUp() {
        service = new BranchService(repository, serviceAreaRepository);

        sampleBranch = new Branch();
        sampleBranch.setId(1L);
        sampleBranch.setCode("BR-COL-001");
        sampleBranch.setName("Colombo Central Branch");
        sampleBranch.setAddressLine1("123 Galle Road");
        sampleBranch.setAddressLine2("Kollupitiya");
        sampleBranch.setCity("Colombo");
        sampleBranch.setPhone("+94112345678");
        sampleBranch.setEmail("colombo@swiftdrop.lk");
        sampleBranch.setLatitude(6.9271);
        sampleBranch.setLongitude(79.8612);
        sampleBranch.setStatus(BranchStatus.ACTIVE);
        sampleBranch.setCreatedAt(LocalDateTime.now());
        sampleBranch.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should successfully create a branch and automatically create one default 25.00 km service area")
    void shouldCreateBranchSuccessfully() {
        BranchCreateRequest request = new BranchCreateRequest(
                "BR-COL-001",
                "Colombo Central Branch",
                "123 Galle Road",
                "Kollupitiya",
                "Colombo",
                "+94112345678",
                "colombo@swiftdrop.lk",
                6.9271,
                79.8612
        );

        when(repository.existsByCode("BR-COL-001")).thenReturn(false);
        when(repository.save(any(Branch.class))).thenReturn(sampleBranch);
        when(serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(1L)).thenReturn(Collections.emptyList());

        BranchResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getCode()).isEqualTo("BR-COL-001");
        assertThat(response.getName()).isEqualTo("Colombo Central Branch");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        verify(repository, times(1)).save(any(Branch.class));

        ArgumentCaptor<ServiceArea> areaCaptor = ArgumentCaptor.forClass(ServiceArea.class);
        verify(serviceAreaRepository, times(1)).save(areaCaptor.capture());

        ServiceArea createdArea = areaCaptor.getValue();
        assertThat(createdArea.getBranch()).isSameAs(sampleBranch);
        assertThat(createdArea.getBranch().getId()).isEqualTo(1L);
        assertThat(createdArea.getCenterLatitude()).isEqualTo(6.9271);
        assertThat(createdArea.getCenterLongitude()).isEqualTo(79.8612);
        assertThat(createdArea.getMaxRadiusKm()).isEqualByComparingTo(new BigDecimal("25.00"));
        assertThat(createdArea.getMaxRadiusKm().scale()).isEqualTo(2);
        assertThat(createdArea.getStatus()).isEqualTo(ServiceAreaStatus.ACTIVE);
        assertThat(createdArea.getAreaName()).isEqualTo("Colombo Central Branch - 25 km Coverage Zone");
    }

    @Test
    @DisplayName("Should reject branch creation with duplicate code")
    void shouldRejectDuplicateBranchCodeOnCreate() {
        BranchCreateRequest request = new BranchCreateRequest(
                "BR-COL-001",
                "Colombo Branch",
                "Galle Road",
                null,
                "Colombo",
                "+94112345678",
                null,
                6.9271,
                79.8612
        );

        when(repository.existsByCode("BR-COL-001")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Branch with code 'BR-COL-001' already exists");

        verify(repository, never()).save(any(Branch.class));
    }

    @Test
    @DisplayName("Should retrieve all branches ordered by name")
    void shouldRetrieveAllBranches() {
        when(repository.findAllByOrderByNameAsc()).thenReturn(List.of(sampleBranch));

        List<BranchResponse> responses = service.findAll(null);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getCode()).isEqualTo("BR-COL-001");
        verify(repository, times(1)).findAllByOrderByNameAsc();
    }

    @Test
    @DisplayName("Should filter branches by status")
    void shouldFilterBranchesByStatus() {
        when(repository.findByStatusOrderByNameAsc(BranchStatus.ACTIVE)).thenReturn(List.of(sampleBranch));

        List<BranchResponse> responses = service.findAll(BranchStatus.ACTIVE);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getStatus()).isEqualTo("ACTIVE");
        verify(repository, times(1)).findByStatusOrderByNameAsc(BranchStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should retrieve branch by ID")
    void shouldFindBranchById() {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleBranch));

        BranchResponse response = service.findById(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getCode()).isEqualTo("BR-COL-001");
    }

    @Test
    @DisplayName("Should return 404 ResourceNotFoundException for nonexistent branch ID")
    void shouldThrowNotFoundForNonexistentBranch() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Branch not found with id: 999");
    }

    @Test
    @DisplayName("Should update one field without changing other fields")
    void shouldUpdateOneFieldWithoutChangingOthers() {
        BranchUpdateRequest request = new BranchUpdateRequest();
        request.setPhone("+94119999999");

        when(repository.findById(1L)).thenReturn(Optional.of(sampleBranch));
        when(repository.save(any(Branch.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BranchResponse response = service.update(1L, request);

        assertThat(response.getPhone()).isEqualTo("+94119999999");
        assertThat(response.getName()).isEqualTo("Colombo Central Branch");
        assertThat(response.getCode()).isEqualTo("BR-COL-001");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Should deactivate a branch (soft deactivation without deleting)")
    void shouldDeactivateBranch() {
        BranchUpdateRequest request = new BranchUpdateRequest();
        request.setStatus("INACTIVE");

        when(repository.findById(1L)).thenReturn(Optional.of(sampleBranch));
        when(repository.save(any(Branch.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BranchResponse response = service.update(1L, request);

        assertThat(response.getStatus()).isEqualTo("INACTIVE");
        assertThat(response.getId()).isEqualTo(1L);
        verify(repository, never()).delete(any());
        verify(repository, never()).deleteById(any());
    }

    @Test
    @DisplayName("Should activate an inactive branch")
    void shouldActivateBranch() {
        sampleBranch.setStatus(BranchStatus.INACTIVE);
        BranchUpdateRequest request = new BranchUpdateRequest();
        request.setStatus("ACTIVE");

        when(repository.findById(1L)).thenReturn(Optional.of(sampleBranch));
        when(repository.save(any(Branch.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BranchResponse response = service.update(1L, request);

        assertThat(response.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Should reject update with invalid status string")
    void shouldRejectInvalidStatusOnUpdate() {
        BranchUpdateRequest request = new BranchUpdateRequest();
        request.setStatus("UNKNOWN_STATUS");

        when(repository.findById(1L)).thenReturn(Optional.of(sampleBranch));

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid branch status: 'UNKNOWN_STATUS'");
    }

    @Test
    @DisplayName("Should reject code update if new code conflicts with existing branch")
    void shouldRejectDuplicateCodeOnUpdate() {
        BranchUpdateRequest request = new BranchUpdateRequest();
        request.setCode("BR-KAN-002");

        when(repository.findById(1L)).thenReturn(Optional.of(sampleBranch));
        when(repository.existsByCode("BR-KAN-002")).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Branch with code 'BR-KAN-002' already exists");
    }

    @Test
    @DisplayName("Should normalize branch code to uppercase and trim fields on create")
    void shouldNormalizeCodeAndTrimFieldsOnCreate() {
        BranchCreateRequest request = new BranchCreateRequest(
                "  br-col-001  ",
                "  Colombo Central Branch  ",
                "  123 Galle Road  ",
                "   ",
                "  Colombo  ",
                "  +94 11 234 5678  ",
                "   ",
                6.9271,
                79.8612
        );

        when(repository.existsByCode("BR-COL-001")).thenReturn(false);
        when(repository.save(any(Branch.class))).thenAnswer(invocation -> {
            Branch saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        BranchResponse response = service.create(request);

        assertThat(response.getCode()).isEqualTo("BR-COL-001");
        assertThat(response.getName()).isEqualTo("Colombo Central Branch");
        assertThat(response.getAddressLine1()).isEqualTo("123 Galle Road");
        assertThat(response.getAddressLine2()).isNull();
        assertThat(response.getCity()).isEqualTo("Colombo");
        assertThat(response.getPhone()).isEqualTo("+94 11 234 5678");
        assertThat(response.getEmail()).isNull();
    }

    @Test
    @DisplayName("Should reject blank required fields or invalid phone on PATCH update")
    void shouldRejectBlankFieldsOrInvalidPhoneOnUpdate() {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleBranch));

        BranchUpdateRequest blankName = new BranchUpdateRequest();
        blankName.setName("   ");
        assertThatThrownBy(() -> service.update(1L, blankName))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Branch name must not be blank");

        BranchUpdateRequest invalidPhone = new BranchUpdateRequest();
        invalidPhone.setPhone("abc-invalid");
        assertThatThrownBy(() -> service.update(1L, invalidPhone))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Phone must be a valid phone number");
    }

    @Test
    @DisplayName("Should update default service area center when branch moves and preserve custom service areas")
    void shouldUpdateDefaultServiceAreaCenterWhenBranchMovesAndPreserveCustomAreas() {
        ServiceArea defaultArea = new ServiceArea();
        defaultArea.setId(101L);
        defaultArea.setBranch(sampleBranch);
        defaultArea.setAreaName("Colombo Central Branch - 25 km Coverage Zone");
        defaultArea.setCenterLatitude(6.9271);
        defaultArea.setCenterLongitude(79.8612);
        defaultArea.setMaxRadiusKm(new BigDecimal("25.00"));
        defaultArea.setStatus(ServiceAreaStatus.ACTIVE);

        ServiceArea customOffsetArea = new ServiceArea();
        customOffsetArea.setId(102L);
        customOffsetArea.setBranch(sampleBranch);
        customOffsetArea.setAreaName("Colombo Harbour Custom Zone");
        customOffsetArea.setCenterLatitude(6.9500);
        customOffsetArea.setCenterLongitude(79.8400);
        customOffsetArea.setMaxRadiusKm(new BigDecimal("12.50"));
        customOffsetArea.setStatus(ServiceAreaStatus.INACTIVE);

        when(repository.findById(1L)).thenReturn(Optional.of(sampleBranch));
        when(repository.save(any(Branch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(1L))
                .thenReturn(List.of(defaultArea, customOffsetArea));

        BranchUpdateRequest updateRequest = new BranchUpdateRequest();
        updateRequest.setLatitude(6.9000);
        updateRequest.setLongitude(79.8800);

        BranchResponse response = service.update(1L, updateRequest);

        assertThat(response.getLatitude()).isEqualTo(6.9000);
        assertThat(response.getLongitude()).isEqualTo(79.8800);

        // Default area centered on previous branch coordinates moves with the branch, keeping radius & status intact
        assertThat(defaultArea.getCenterLatitude()).isEqualTo(6.9000);
        assertThat(defaultArea.getCenterLongitude()).isEqualTo(79.8800);
        assertThat(defaultArea.getMaxRadiusKm()).isEqualByComparingTo(new BigDecimal("25.00"));
        assertThat(defaultArea.getStatus()).isEqualTo(ServiceAreaStatus.ACTIVE);
        verify(serviceAreaRepository, times(1)).save(defaultArea);

        // Custom area with different center coordinates is NOT moved or modified
        assertThat(customOffsetArea.getCenterLatitude()).isEqualTo(6.9500);
        assertThat(customOffsetArea.getCenterLongitude()).isEqualTo(79.8400);
        assertThat(customOffsetArea.getMaxRadiusKm()).isEqualByComparingTo(new BigDecimal("12.50"));
        assertThat(customOffsetArea.getStatus()).isEqualTo(ServiceAreaStatus.INACTIVE);
        verify(serviceAreaRepository, never()).save(customOffsetArea);
    }

    @Test
    @DisplayName("Should idempotently backfill default 25.00 km service areas only for branches without service areas")
    void shouldBackfillOnlyBranchesWithoutServiceAreas() {
        Branch coveredBranch = sampleBranch;

        Branch uncoveredBranch = new Branch();
        uncoveredBranch.setId(2L);
        uncoveredBranch.setCode("BR-KDY-001");
        uncoveredBranch.setName("Kandy Regional Hub");
        uncoveredBranch.setCity("Kandy");
        uncoveredBranch.setLatitude(7.2906);
        uncoveredBranch.setLongitude(80.6337);
        uncoveredBranch.setStatus(BranchStatus.ACTIVE);

        ServiceArea existingCustomArea = new ServiceArea();
        existingCustomArea.setId(201L);
        existingCustomArea.setBranch(coveredBranch);
        existingCustomArea.setAreaName("Existing Custom 15 km Area");
        existingCustomArea.setCenterLatitude(6.9271);
        existingCustomArea.setCenterLongitude(79.8612);
        existingCustomArea.setMaxRadiusKm(new BigDecimal("15.00"));
        existingCustomArea.setStatus(ServiceAreaStatus.ACTIVE);

        when(repository.findAllByOrderByNameAsc()).thenReturn(List.of(coveredBranch, uncoveredBranch));
        when(serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(1L)).thenReturn(List.of(existingCustomArea));
        when(serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(2L)).thenReturn(Collections.emptyList());

        int createdCount = service.backfillMissingDefaultServiceAreas();

        assertThat(createdCount).isEqualTo(1);
        assertThat(existingCustomArea.getMaxRadiusKm()).isEqualByComparingTo(new BigDecimal("15.00"));

        ArgumentCaptor<ServiceArea> areaCaptor = ArgumentCaptor.forClass(ServiceArea.class);
        verify(serviceAreaRepository, times(1)).save(areaCaptor.capture());

        ServiceArea backfilled = areaCaptor.getValue();
        assertThat(backfilled.getBranch()).isSameAs(uncoveredBranch);
        assertThat(backfilled.getCenterLatitude()).isEqualTo(7.2906);
        assertThat(backfilled.getCenterLongitude()).isEqualTo(80.6337);
        assertThat(backfilled.getMaxRadiusKm()).isEqualByComparingTo(new BigDecimal("25.00"));
        assertThat(backfilled.getStatus()).isEqualTo(ServiceAreaStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should propagate exception to roll back transaction if default service area save fails")
    void shouldPropagateExceptionForTransactionRollbackIfDefaultServiceAreaSaveFails() {
        BranchCreateRequest request = new BranchCreateRequest(
                "BR-COL-001",
                "Colombo Central Branch",
                "123 Galle Road",
                null,
                "Colombo",
                "+94112345678",
                null,
                6.9271,
                79.8612
        );

        when(repository.existsByCode("BR-COL-001")).thenReturn(false);
        when(repository.save(any(Branch.class))).thenReturn(sampleBranch);
        when(serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(1L)).thenReturn(Collections.emptyList());
        when(serviceAreaRepository.save(any(ServiceArea.class)))
                .thenThrow(new RuntimeException("Simulated database failure on service_areas insert"));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Simulated database failure on service_areas insert");
    }
}

