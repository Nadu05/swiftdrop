package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.dto.AssignmentHistoryResponse;
import com.swiftdrop.dispatch.dto.AssignmentReassignRequest;
import com.swiftdrop.dispatch.dto.AssignmentRequest;
import com.swiftdrop.dispatch.dto.AssignmentResponse;
import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.AssignmentHistory;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.entity.enums.VehicleType;
import com.swiftdrop.dispatch.exception.CourierNotAvailableException;
import com.swiftdrop.dispatch.exception.DuplicateAssignmentException;
import com.swiftdrop.dispatch.exception.InvalidAssignmentStateException;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.exception.ServiceUnavailableException;
import com.swiftdrop.dispatch.repository.AssignmentHistoryRepository;
import com.swiftdrop.dispatch.repository.AssignmentRepository;
import com.swiftdrop.dispatch.repository.CourierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceTest {

    @Mock
    private CourierRepository courierRepository;

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private AssignmentHistoryRepository assignmentHistoryRepository;

    @Mock
    private OrderServiceClient orderServiceClient;

    @Mock
    private OutboxPublisherService outboxPublisherService;

    @InjectMocks
    private AssignmentService assignmentService;

    private Courier sampleCourier;
    private Courier targetCourier;
    private Assignment sampleAssignment;
    private AssignmentRequest sampleRequest;

    @BeforeEach
    void setUp() {
        sampleCourier = new Courier();
        sampleCourier.setId(5L);
        sampleCourier.setCourierCode("CR-101");
        sampleCourier.setName("Kamal Silva");
        sampleCourier.setPhone("+94 77 123 4567");
        sampleCourier.setStatus(CourierStatus.AVAILABLE);
        sampleCourier.setVehicleType(VehicleType.MOTORCYCLE);
        sampleCourier.setBranchId(100L);
        sampleCourier.setMaxCapacity(5);

        targetCourier = new Courier();
        targetCourier.setId(8L);
        targetCourier.setCourierCode("CR-102");
        targetCourier.setName("Nimal Perera");
        targetCourier.setPhone("+94 77 987 6543");
        targetCourier.setStatus(CourierStatus.AVAILABLE);
        targetCourier.setVehicleType(VehicleType.VAN);
        targetCourier.setBranchId(100L);
        targetCourier.setMaxCapacity(5);

        sampleAssignment = new Assignment();
        sampleAssignment.setId(10L);
        sampleAssignment.setAssignmentCode("ASN-ABCD1234");
        sampleAssignment.setOrderId(101L);
        sampleAssignment.setCourier(sampleCourier);
        sampleAssignment.setBranchId(100L);
        sampleAssignment.setStatus(AssignmentStatus.ASSIGNED);
        sampleAssignment.setAssignedAt(LocalDateTime.now().minusHours(1));
        sampleAssignment.setAssignedBy(1L);

        sampleRequest = new AssignmentRequest(101L, 5L);
    }

    // ==========================================
    // Task 05 & 06 Tests: Assignment Creation
    // ==========================================

    @Test
    @DisplayName("Scenario 1 — Successful assignment creation with pessimistic lock")
    void test1_SuccessfulAssignment() {
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(5L), any())).thenReturn(2L);
        when(assignmentRepository.existsByOrderIdAndStatusIn(eq(101L), any())).thenReturn(false);

        when(assignmentRepository.saveAndFlush(any(Assignment.class))).thenAnswer(invocation -> {
            Assignment a = invocation.getArgument(0);
            a.setId(10L);
            return a;
        });

        AssignmentResponse response = assignmentService.createAssignment(sampleRequest);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getOrderId()).isEqualTo(101L);
        assertThat(response.getCourierId()).isEqualTo(5L);
        assertThat(response.getCourierCode()).isEqualTo("CR-101");
        assertThat(response.getBranchId()).isEqualTo(100L);
        assertThat(response.getStatus()).isEqualTo(AssignmentStatus.ASSIGNED);
        assertThat(response.getAssignmentCode()).startsWith("ASN-");

        verify(courierRepository).findByIdForUpdate(5L);
        verify(assignmentRepository, times(1)).saveAndFlush(any(Assignment.class));
        verify(assignmentHistoryRepository, times(1)).save(any(AssignmentHistory.class));
    }

    @Test
    @DisplayName("Scenario 2 — Courier does not exist throws ResourceNotFoundException")
    void test2_CourierDoesNotExist() {
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        AssignmentRequest request = new AssignmentRequest(101L, 999L);

        assertThatThrownBy(() -> assignmentService.createAssignment(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Courier not found with id: 999");

        verify(assignmentRepository, never()).saveAndFlush(any());
        verify(assignmentHistoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 3 — Courier is OFFLINE throws CourierNotAvailableException")
    void test3_CourierIsOffline() {
        sampleCourier.setStatus(CourierStatus.OFFLINE);
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(sampleCourier));

        assertThatThrownBy(() -> assignmentService.createAssignment(sampleRequest))
                .isInstanceOf(CourierNotAvailableException.class)
                .hasMessageContaining("Courier is currently offline");

        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Scenario 4 — Courier is BUSY throws CourierNotAvailableException")
    void test4_CourierIsBusy() {
        sampleCourier.setStatus(CourierStatus.BUSY);
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(sampleCourier));

        assertThatThrownBy(() -> assignmentService.createAssignment(sampleRequest))
                .isInstanceOf(CourierNotAvailableException.class)
                .hasMessageContaining("Courier is currently busy");

        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Scenario 5 — Courier has reached maximum capacity throws CourierNotAvailableException")
    void test5_CourierHasReachedCapacity() {
        sampleCourier.setMaxCapacity(5);
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(5L), any())).thenReturn(5L);

        assertThatThrownBy(() -> assignmentService.createAssignment(sampleRequest))
                .isInstanceOf(CourierNotAvailableException.class)
                .hasMessageContaining("Courier has reached maximum delivery capacity");

        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Scenario 6 — Order already has an active assignment throws DuplicateAssignmentException")
    void test6_OrderAlreadyHasActiveAssignment() {
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(5L), any())).thenReturn(1L);
        when(assignmentRepository.existsByOrderIdAndStatusIn(eq(101L), any())).thenReturn(true);

        assertThatThrownBy(() -> assignmentService.createAssignment(sampleRequest))
                .isInstanceOf(DuplicateAssignmentException.class)
                .hasMessageContaining("Order 101 already has an active courier assignment");

        verify(assignmentRepository, never()).saveAndFlush(any());
        verify(assignmentHistoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 7 — Initial assignment history record is created with correct audit details")
    void test7_InitialAssignmentHistoryCreated() {
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(5L), any())).thenReturn(0L);
        when(assignmentRepository.existsByOrderIdAndStatusIn(eq(101L), any())).thenReturn(false);

        Assignment savedAssignment = new Assignment();
        savedAssignment.setId(77L);
        savedAssignment.setOrderId(101L);
        savedAssignment.setCourier(sampleCourier);
        savedAssignment.setBranchId(100L);
        savedAssignment.setStatus(AssignmentStatus.ASSIGNED);
        savedAssignment.setAssignedAt(LocalDateTime.now());
        savedAssignment.setAssignedBy(1L);
        savedAssignment.setAssignmentCode("ASN-TESTCODE");

        when(assignmentRepository.saveAndFlush(any(Assignment.class))).thenReturn(savedAssignment);

        assignmentService.createAssignment(sampleRequest);

        ArgumentCaptor<AssignmentHistory> historyCaptor = ArgumentCaptor.forClass(AssignmentHistory.class);
        verify(assignmentHistoryRepository).save(historyCaptor.capture());

        AssignmentHistory capturedHistory = historyCaptor.getValue();
        assertThat(capturedHistory).isNotNull();
        assertThat(capturedHistory.getAssignment()).isEqualTo(savedAssignment);
        assertThat(capturedHistory.getPreviousCourier()).isNull();
        assertThat(capturedHistory.getNewCourier()).isEqualTo(sampleCourier);
        assertThat(capturedHistory.getChangedBy()).isEqualTo(1L);
        assertThat(capturedHistory.getChangeReason()).isEqualTo("Initial dispatch allocation");
    }

    @Test
    @DisplayName("Scenario 8 — Invalid request throws IllegalArgumentException")
    void test8_InvalidRequest() {
        assertThatThrownBy(() -> assignmentService.createAssignment(null))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> assignmentService.createAssignment(new AssignmentRequest(null, 5L)))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> assignmentService.createAssignment(new AssignmentRequest(101L, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Scenario 9 — Order Service unavailable propagates ServiceUnavailableException")
    void test9_OrderServiceUnavailable() {
        doThrow(new ServiceUnavailableException("Order Service connection timed out"))
                .when(orderServiceClient).verifyOrderEligibleForDispatch(101L);

        assertThatThrownBy(() -> assignmentService.createAssignment(sampleRequest))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessageContaining("Order Service connection timed out");

        verify(courierRepository, never()).findByIdForUpdate(any());
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    // ==========================================
    // Task 07 Tests: Part A — Retrieval
    // ==========================================

    @Test
    @DisplayName("Task 07 - Test 1: Retrieve all assignments without filters")
    void test10_FindAllWithoutFilters() {
        when(assignmentRepository.findWithFilters(null, null, null, null))
                .thenReturn(List.of(sampleAssignment));

        List<AssignmentResponse> result = assignmentService.findAll(null, null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(10L);
        assertThat(result.get(0).getCourierId()).isEqualTo(5L);
        assertThat(result.get(0).getCourierCode()).isEqualTo("CR-101");
        verify(assignmentRepository).findWithFilters(null, null, null, null);
    }

    @Test
    @DisplayName("Task 07 - Test 2: Retrieve assignment by ID successfully")
    void test11_FindByIdSuccess() {
        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));

        AssignmentResponse response = assignmentService.findById(10L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getOrderId()).isEqualTo(101L);
        assertThat(response.getCourierId()).isEqualTo(5L);
        assertThat(response.getCourierCode()).isEqualTo("CR-101");
        verify(assignmentRepository).findByIdWithCourier(10L);
    }

    @Test
    @DisplayName("Task 07 - Test 2: Retrieve assignment by nonexistent ID throws ResourceNotFoundException")
    void test12_FindByIdNotFound() {
        when(assignmentRepository.findByIdWithCourier(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.findById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Assignment not found with id: 999");
    }

    @Test
    @DisplayName("Task 07 - Test 3: Retrieve assignment history chronologically")
    void test13_FindHistorySuccess() {
        when(assignmentRepository.existsById(10L)).thenReturn(true);

        AssignmentHistory h1 = new AssignmentHistory(sampleAssignment, null, sampleCourier, 1L, "Initial allocation", LocalDateTime.now().minusHours(2));
        h1.setId(1L);
        AssignmentHistory h2 = new AssignmentHistory(sampleAssignment, sampleCourier, targetCourier, 2L, "Vehicle breakdown", LocalDateTime.now().minusHours(1));
        h2.setId(2L);

        when(assignmentHistoryRepository.findHistoryByAssignmentIdChronological(10L)).thenReturn(List.of(h1, h2));

        List<AssignmentHistoryResponse> history = assignmentService.findHistoryByAssignmentId(10L);

        assertThat(history).hasSize(2);
        assertThat(history.get(0).getId()).isEqualTo(1L);
        assertThat(history.get(0).getPreviousCourierId()).isNull();
        assertThat(history.get(0).getNewCourierId()).isEqualTo(5L);
        assertThat(history.get(0).getNewCourierCode()).isEqualTo("CR-101");
        assertThat(history.get(0).getChangeReason()).isEqualTo("Initial allocation");

        assertThat(history.get(1).getId()).isEqualTo(2L);
        assertThat(history.get(1).getPreviousCourierId()).isEqualTo(5L);
        assertThat(history.get(1).getPreviousCourierCode()).isEqualTo("CR-101");
        assertThat(history.get(1).getNewCourierId()).isEqualTo(8L);
        assertThat(history.get(1).getNewCourierCode()).isEqualTo("CR-102");
        assertThat(history.get(1).getChangeReason()).isEqualTo("Vehicle breakdown");
    }

    @Test
    @DisplayName("Task 07 - Test 3: Retrieve history for nonexistent assignment throws ResourceNotFoundException")
    void test14_FindHistoryNotFound() {
        when(assignmentRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> assignmentService.findHistoryByAssignmentId(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Assignment not found with id: 999");
    }

    @Test
    @DisplayName("Task 07 - Test 4: Filter assignments by courierId, branchId, status, and orderId")
    void test15_FilterAssignments() {
        when(assignmentRepository.findWithFilters(5L, 100L, AssignmentStatus.ASSIGNED, 101L))
                .thenReturn(List.of(sampleAssignment));

        List<AssignmentResponse> result = assignmentService.findAll(5L, 100L, AssignmentStatus.ASSIGNED, 101L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(10L);
        assertThat(result.get(0).getStatus()).isEqualTo(AssignmentStatus.ASSIGNED);
        verify(assignmentRepository).findWithFilters(5L, 100L, AssignmentStatus.ASSIGNED, 101L);
    }

    // ==========================================
    // Task 07 Tests: Part B — Reassignment
    // ==========================================

    @Test
    @DisplayName("Task 07 - Test 5, 11, 12: Successfully reassign courier and verify audit history preservation")
    void test16_SuccessfullyReassignCourier() {
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Original courier vehicle issue", 99L);

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(courierRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(targetCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(8L), any())).thenReturn(1L);

        when(assignmentRepository.saveAndFlush(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssignmentResponse response = assignmentService.reassignCourier(10L, reassignRequest);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getCourierId()).isEqualTo(8L);
        assertThat(response.getCourierCode()).isEqualTo("CR-102");
        assertThat(response.getStatus()).isEqualTo(AssignmentStatus.ASSIGNED);

        // Verify assignment entity state updated
        assertThat(sampleAssignment.getCourier()).isEqualTo(targetCourier);
        assertThat(sampleAssignment.getBranchId()).isEqualTo(targetCourier.getBranchId());

        // Verify audit history saved with previous and new couriers preserved
        ArgumentCaptor<AssignmentHistory> historyCaptor = ArgumentCaptor.forClass(AssignmentHistory.class);
        verify(assignmentHistoryRepository).save(historyCaptor.capture());

        AssignmentHistory history = historyCaptor.getValue();
        assertThat(history.getAssignment()).isEqualTo(sampleAssignment);
        assertThat(history.getPreviousCourier()).isEqualTo(sampleCourier);
        assertThat(history.getNewCourier()).isEqualTo(targetCourier);
        assertThat(history.getChangedBy()).isEqualTo(99L);
        assertThat(history.getChangeReason()).isEqualTo("Original courier vehicle issue");
        assertThat(history.getChangedAt()).isNotNull();
    }

    @Test
    @DisplayName("Task 07 - Test 6: Reassignment with nonexistent courier throws ResourceNotFoundException")
    void test17_ReassignNonexistentCourier() {
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(999L, "Reassigning");

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(courierRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, reassignRequest))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Courier not found with id: 999");

        verify(assignmentRepository, never()).saveAndFlush(any());
        verify(assignmentHistoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Task 07 - Test 7: Reassignment with nonexistent assignment throws ResourceNotFoundException")
    void test18_ReassignNonexistentAssignment() {
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Reassigning");

        when(assignmentRepository.findByIdWithCourier(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.reassignCourier(999L, reassignRequest))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Assignment not found with id: 999");

        verify(courierRepository, never()).findByIdForUpdate(any());
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Task 07 - Test 8: Reassignment to unavailable courier (OFFLINE) throws CourierNotAvailableException")
    void test19_ReassignUnavailableCourierOffline() {
        targetCourier.setStatus(CourierStatus.OFFLINE);
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Reassigning");

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(courierRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(targetCourier));

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, reassignRequest))
                .isInstanceOf(CourierNotAvailableException.class)
                .hasMessageContaining("Courier is currently offline");

        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Task 07 - Test 8: Reassignment to busy courier (BUSY) throws CourierNotAvailableException")
    void test20_ReassignUnavailableCourierBusy() {
        targetCourier.setStatus(CourierStatus.BUSY);
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Reassigning");

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(courierRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(targetCourier));

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, reassignRequest))
                .isInstanceOf(CourierNotAvailableException.class)
                .hasMessageContaining("Courier is currently busy");

        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Task 07 - Test 9: Reassignment when courier capacity is full throws CourierNotAvailableException")
    void test21_ReassignCourierCapacityFull() {
        targetCourier.setMaxCapacity(3);
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Reassigning");

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(courierRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(targetCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(8L), any())).thenReturn(3L);

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, reassignRequest))
                .isInstanceOf(CourierNotAvailableException.class)
                .hasMessageContaining("Courier has reached maximum delivery capacity");

        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Task 07 - Test 10: Reassignment of terminal assignment DELIVERED throws InvalidAssignmentStateException")
    void test22_ReassignTerminalAssignmentDelivered() {
        sampleAssignment.setStatus(AssignmentStatus.DELIVERED);
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Reassigning");

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, reassignRequest))
                .isInstanceOf(InvalidAssignmentStateException.class)
                .hasMessageContaining("Cannot reassign assignment with status 'DELIVERED'");

        verify(courierRepository, never()).findByIdForUpdate(any());
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Task 07 - Test 10: Reassignment of terminal assignment CANCELLED throws InvalidAssignmentStateException")
    void test23_ReassignTerminalAssignmentCancelled() {
        sampleAssignment.setStatus(AssignmentStatus.CANCELLED);
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Reassigning");

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, reassignRequest))
                .isInstanceOf(InvalidAssignmentStateException.class)
                .hasMessageContaining("Cannot reassign assignment with status 'CANCELLED'");

        verify(courierRepository, never()).findByIdForUpdate(any());
    }

    @Test
    @DisplayName("Task 07 - Test 10: Reassignment of terminal assignment FAILED throws InvalidAssignmentStateException")
    void test24_ReassignTerminalAssignmentFailed() {
        sampleAssignment.setStatus(AssignmentStatus.FAILED);
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Reassigning");

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, reassignRequest))
                .isInstanceOf(InvalidAssignmentStateException.class)
                .hasMessageContaining("Cannot reassign assignment with status 'FAILED'");

        verify(courierRepository, never()).findByIdForUpdate(any());
    }

    @Test
    @DisplayName("Task 07: Reassigning to the currently assigned courier throws IllegalArgumentException")
    void test25_ReassignToSameCourierThrows() {
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(5L, "Reassigning to same courier");

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, reassignRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Assignment is already assigned to courier 5");

        verify(courierRepository, never()).findByIdForUpdate(any());
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Task 07: Reassignment with null request or null courierId throws IllegalArgumentException")
    void test26_ReassignInvalidRequest() {
        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("New courier ID is required");

        assertThatThrownBy(() -> assignmentService.reassignCourier(10L, new AssignmentReassignRequest(null, "Reason")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("New courier ID is required");
    }

    // ==========================================
    // Task 08 & Task 09 Tests: Event Publishing & Ownership
    // ==========================================

    @Test
    @DisplayName("Task 09 - Test 1: Assignment creation publishes dispatch.courier.assigned.v1 event")
    void test27_AssignmentCreatedPublishesEvent() {
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(5L), any())).thenReturn(0L);
        when(assignmentRepository.existsByOrderIdAndStatusIn(eq(101L), any())).thenReturn(false);

        when(assignmentRepository.saveAndFlush(any(Assignment.class))).thenAnswer(invocation -> {
            Assignment a = invocation.getArgument(0);
            a.setId(10L);
            return a;
        });

        assignmentService.createAssignment(sampleRequest);

        verify(outboxPublisherService, times(1))
                .saveAndPublish(eq("dispatch.courier.assigned.v1"), any(com.swiftdrop.dispatch.event.DispatchEvent.class));
    }

    @Test
    @DisplayName("Task 09 - Test 2: Courier reassignment publishes dispatch.courier.reassigned.v1 event")
    void test28_CourierReassignedPublishesEvent() {
        AssignmentReassignRequest reassignRequest = new AssignmentReassignRequest(8L, "Courier vehicle breakdown", 99L);

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(courierRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(targetCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(8L), any())).thenReturn(0L);
        when(assignmentRepository.saveAndFlush(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assignmentService.reassignCourier(10L, reassignRequest);

        verify(outboxPublisherService, times(1))
                .saveAndPublish(eq("dispatch.courier.reassigned.v1"), any(com.swiftdrop.dispatch.event.DispatchEvent.class));
    }

    @Test
    @DisplayName("Task 09 - Test 3: Status change publishes dispatch.delivery.status.changed.v1 event")
    void test29_StatusChangePublishesEvent() {
        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(assignmentRepository.saveAndFlush(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest statusRequest =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.ACCEPTED, "Accepted by courier");

        assignmentService.updateAssignmentStatus(10L, statusRequest, 1L, false);

        assertThat(sampleAssignment.getStatus()).isEqualTo(AssignmentStatus.ACCEPTED);
        verify(outboxPublisherService, times(1))
                .saveAndPublish(eq("dispatch.delivery.status.changed.v1"), any(com.swiftdrop.dispatch.event.DispatchEvent.class));
    }

    @Test
    @DisplayName("Task 09 - Test 5: Event is not published when assignment creation fails")
    void test30_NoEventWhenAssignmentCreationFails() {
        doNothing().when(orderServiceClient).verifyOrderEligibleForDispatch(101L);
        when(courierRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(5L), any())).thenReturn(5L); // at capacity

        assertThatThrownBy(() -> assignmentService.createAssignment(sampleRequest))
                .isInstanceOf(CourierNotAvailableException.class);

        verify(outboxPublisherService, never()).saveAndPublish(any(), any());
    }

    @Test
    @DisplayName("Task 08: Courier updating their own assignment succeeds")
    void test31_CourierUpdatingOwnAssignmentSucceeds() {
        sampleCourier.setUserId(42L);
        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(courierRepository.findByUserId(42L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.saveAndFlush(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest statusRequest =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.ACCEPTED, "Courier accepted order");

        AssignmentResponse response = assignmentService.updateAssignmentStatus(10L, statusRequest, 42L, true);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(AssignmentStatus.ACCEPTED);
        verify(outboxPublisherService).saveAndPublish(eq("dispatch.delivery.status.changed.v1"), any());
    }

    @Test
    @DisplayName("Task 08: Courier attempting to update another courier's assignment throws AccessDeniedException")
    void test32_CourierUpdatingAnotherCourierAssignmentForbidden() {
        Courier anotherCourier = new Courier();
        anotherCourier.setId(99L);
        anotherCourier.setUserId(999L);

        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment)); // assigned to courier 5
        when(courierRepository.findByUserId(999L)).thenReturn(Optional.of(anotherCourier));

        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest statusRequest =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.ACCEPTED, "Intruder accepting");

        assertThatThrownBy(() -> assignmentService.updateAssignmentStatus(10L, statusRequest, 999L, true))
                .isInstanceOf(com.swiftdrop.dispatch.exception.AccessDeniedException.class)
                .hasMessageContaining("not authorized to update assignment 10");

        verify(outboxPublisherService, never()).saveAndPublish(any(), any());
    }

    @Test
    @DisplayName("Task 08: Courier viewing their own assignments maps userId to courier profile")
    void test33_CourierViewingOwnAssignments() {
        sampleCourier.setUserId(42L);
        when(courierRepository.findByUserId(42L)).thenReturn(Optional.of(sampleCourier));
        when(assignmentRepository.findByCourierId(5L)).thenReturn(List.of(sampleAssignment));

        List<AssignmentResponse> results = assignmentService.findAssignmentsForCourierUser(42L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getCourierId()).isEqualTo(5L);
        assertThat(results.get(0).getOrderId()).isEqualTo(101L);
    }

    @Test
    @DisplayName("Task 08: Invalid delivery status transition throws InvalidAssignmentStateException")
    void test34_InvalidStatusTransitionRejected() {
        sampleAssignment.setStatus(AssignmentStatus.ASSIGNED);
        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));

        // Directly trying to transition ASSIGNED to DELIVERED is forbidden
        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest invalidTransition =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.DELIVERED, "Direct jump");

        assertThatThrownBy(() -> assignmentService.updateAssignmentStatus(10L, invalidTransition, 1L, false))
                .isInstanceOf(InvalidAssignmentStateException.class)
                .hasMessageContaining("Invalid delivery status transition from 'ASSIGNED' to 'DELIVERED'");

        verify(outboxPublisherService, never()).saveAndPublish(any(), any());
    }

    @Test
    @DisplayName("Task 11: Transition to FAILED without notes is rejected with IllegalArgumentException")
    void test35_FailedTransitionRequiresReasonNotes() {
        sampleAssignment.setStatus(AssignmentStatus.IN_TRANSIT);
        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));

        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest requestWithoutNotes =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.FAILED, "   ");

        assertThatThrownBy(() -> assignmentService.updateAssignmentStatus(10L, requestWithoutNotes, 1L, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Failure reason is required");

        verify(assignmentRepository, never()).saveAndFlush(any());
        verify(outboxPublisherService, never()).saveAndPublish(any(), any());
    }

    @Test
    @DisplayName("Task 11: Transition IN_TRANSIT to FAILED with valid reason succeeds and publishes event")
    void test36_FailedTransitionWithReasonSucceeds() {
        sampleAssignment.setStatus(AssignmentStatus.IN_TRANSIT);
        when(assignmentRepository.findByIdWithCourier(10L)).thenReturn(Optional.of(sampleAssignment));
        when(assignmentRepository.saveAndFlush(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest requestWithReason =
                new com.swiftdrop.dispatch.dto.AssignmentStatusUpdateRequest(AssignmentStatus.FAILED, "Recipient unreachable after 3 attempts");

        AssignmentResponse response = assignmentService.updateAssignmentStatus(10L, requestWithReason, 1L, false);

        assertThat(response.getStatus()).isEqualTo(AssignmentStatus.FAILED);
        verify(assignmentHistoryRepository, times(1)).save(any(AssignmentHistory.class));
        verify(outboxPublisherService, times(1))
                .saveAndPublish(eq("dispatch.delivery.status.changed.v1"), any(com.swiftdrop.dispatch.event.DispatchEvent.class));
    }
}
