package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.CourierAvailabilityResponse;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.entity.enums.VehicleType;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.AssignmentRepository;
import com.swiftdrop.dispatch.repository.CourierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourierServiceTest {

    @Mock
    private CourierRepository courierRepository;

    @Mock
    private AssignmentRepository assignmentRepository;

    @InjectMocks
    private CourierService courierService;

    private Courier sampleCourier;

    @BeforeEach
    void setUp() {
        sampleCourier = new Courier();
        sampleCourier.setId(10L);
        sampleCourier.setCourierCode("COU-001");
        sampleCourier.setName("John Doe");
        sampleCourier.setPhone("+1234567890");
        sampleCourier.setStatus(CourierStatus.AVAILABLE);
        sampleCourier.setVehicleType(VehicleType.MOTORCYCLE);
        sampleCourier.setVehiclePlate("ABC-1234");
        sampleCourier.setBranchId(100L);
        sampleCourier.setMaxCapacity(5);
        sampleCourier.setCreatedAt(LocalDateTime.now());
        sampleCourier.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Scenario 1 — Available courier with available capacity is eligible")
    void scenario1_AvailableCourierWithAvailableCapacity() {
        // Arrange
        sampleCourier.setStatus(CourierStatus.AVAILABLE);
        sampleCourier.setMaxCapacity(5);
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(10L), eq(CourierService.ACTIVE_ASSIGNMENT_STATUSES)))
                .thenReturn(2L);

        // Act
        CourierAvailabilityResponse response = courierService.toAvailabilityResponse(sampleCourier);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getCourierCode()).isEqualTo("COU-001");
        assertThat(response.getName()).isEqualTo("John Doe");
        assertThat(response.getStatus()).isEqualTo(CourierStatus.AVAILABLE);
        assertThat(response.getActiveDeliveries()).isEqualTo(2);
        assertThat(response.getMaxCapacity()).isEqualTo(5);
        assertThat(response.getIsEligible()).isTrue();
        assertThat(response.getIneligibilityReason()).isNull();
    }

    @Test
    @DisplayName("Scenario 2 — Courier at maximum capacity is not eligible")
    void scenario2_CourierAtMaximumCapacity() {
        // Arrange
        sampleCourier.setStatus(CourierStatus.AVAILABLE);
        sampleCourier.setMaxCapacity(5);
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(10L), eq(CourierService.ACTIVE_ASSIGNMENT_STATUSES)))
                .thenReturn(5L);

        // Act
        CourierAvailabilityResponse response = courierService.toAvailabilityResponse(sampleCourier);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getActiveDeliveries()).isEqualTo(5);
        assertThat(response.getMaxCapacity()).isEqualTo(5);
        assertThat(response.getIsEligible()).isFalse();
        assertThat(response.getIneligibilityReason()).isEqualTo("Courier has reached maximum delivery capacity");
    }

    @Test
    @DisplayName("Scenario 3 — Busy courier is not eligible")
    void scenario3_BusyCourier() {
        // Arrange
        sampleCourier.setStatus(CourierStatus.BUSY);
        sampleCourier.setMaxCapacity(5);
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(10L), eq(CourierService.ACTIVE_ASSIGNMENT_STATUSES)))
                .thenReturn(2L);

        // Act
        CourierAvailabilityResponse response = courierService.toAvailabilityResponse(sampleCourier);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(CourierStatus.BUSY);
        assertThat(response.getActiveDeliveries()).isEqualTo(2);
        assertThat(response.getIsEligible()).isFalse();
        assertThat(response.getIneligibilityReason()).isEqualTo("Courier is currently busy");
    }

    @Test
    @DisplayName("Scenario 4 — Offline courier is not eligible")
    void scenario4_OfflineCourier() {
        // Arrange
        sampleCourier.setStatus(CourierStatus.OFFLINE);
        sampleCourier.setMaxCapacity(5);
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(10L), eq(CourierService.ACTIVE_ASSIGNMENT_STATUSES)))
                .thenReturn(0L);

        // Act
        CourierAvailabilityResponse response = courierService.toAvailabilityResponse(sampleCourier);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(CourierStatus.OFFLINE);
        assertThat(response.getActiveDeliveries()).isEqualTo(0);
        assertThat(response.getIsEligible()).isFalse();
        assertThat(response.getIneligibilityReason()).isEqualTo("Courier is currently offline");
    }

    @Test
    @DisplayName("Scenario 5 — Completed assignments are excluded from active workload")
    void scenario5_CompletedAssignmentsExcludedFromActiveWorkload() {
        // Active: ASSIGNED, ACCEPTED, IN_TRANSIT. Non-active: DELIVERED, FAILED, REASSIGNED, CANCELLED.
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(10L), eq(CourierService.ACTIVE_ASSIGNMENT_STATUSES)))
                .thenReturn(2L);

        // Act
        int workload = courierService.calculateActiveWorkload(10L);

        // Assert
        assertThat(workload).isEqualTo(2);
        // Verify the exact set of active statuses queried:
        verify(assignmentRepository).countByCourierIdAndStatusIn(eq(10L), eq(Set.of(
                AssignmentStatus.ASSIGNED,
                AssignmentStatus.ACCEPTED,
                AssignmentStatus.IN_TRANSIT
        )));
    }

    @Test
    @DisplayName("Should retrieve couriers filtered by status and branch")
    void shouldRetrieveFilteredCouriers() {
        when(courierRepository.findByStatusAndBranchId(CourierStatus.AVAILABLE, 100L))
                .thenReturn(List.of(sampleCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(10L), any()))
                .thenReturn(1L);

        List<CourierAvailabilityResponse> result =
                courierService.getCourierAvailability(CourierStatus.AVAILABLE, 100L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCourierCode()).isEqualTo("COU-001");
        assertThat(result.get(0).getIsEligible()).isTrue();
        verify(courierRepository).findByStatusAndBranchId(CourierStatus.AVAILABLE, 100L);
    }

    @Test
    @DisplayName("Should retrieve courier availability by ID successfully")
    void shouldRetrieveCourierById() {
        when(courierRepository.findById(10L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(10L), any()))
                .thenReturn(3L);

        CourierAvailabilityResponse response = courierService.getCourierAvailabilityById(10L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getActiveDeliveries()).isEqualTo(3);
        assertThat(response.getIsEligible()).isTrue();
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when courier not found by ID")
    void shouldThrowWhenCourierNotFound() {
        when(courierRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> courierService.getCourierAvailabilityById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Courier not found with id: 999");
    }
}

