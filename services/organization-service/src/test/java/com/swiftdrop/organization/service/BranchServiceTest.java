package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.dto.BranchUpdateRequest;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.BranchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
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

    @InjectMocks
    private BranchService service;

    private Branch sampleBranch;

    @BeforeEach
    void setUp() {
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
    @DisplayName("Should successfully create a branch")
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

        BranchResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getCode()).isEqualTo("BR-COL-001");
        assertThat(response.getName()).isEqualTo("Colombo Central Branch");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        verify(repository, times(1)).save(any(Branch.class));
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
}

