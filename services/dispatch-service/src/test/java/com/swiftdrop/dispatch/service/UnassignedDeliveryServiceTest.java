package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.dto.OrderDetailsDto;
import com.swiftdrop.dispatch.dto.UnassignedDeliveryResponse;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.exception.ServiceUnavailableException;
import com.swiftdrop.dispatch.repository.AssignmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UnassignedDeliveryServiceTest {

    @Mock
    private OrderServiceClient orderServiceClient;

    @Mock
    private AssignmentRepository assignmentRepository;

    @InjectMocks
    private UnassignedDeliveryService unassignedDeliveryService;

    private OrderDetailsDto order101;
    private OrderDetailsDto order102;
    private OrderDetailsDto order103;

    @BeforeEach
    void setUp() {
        order101 = new OrderDetailsDto(
                101L, "ORD-98421", "TRK-00101", 100L,
                "Tharindu Perera", "+94 77 123 5678", "45/2 Dutugemunu St", "Colombo",
                "Apex Electronics LK", "+94 11 234 8899", "URGENT", "Electronics",
                2.4, "30x20x15 cm", "Fragile", LocalDateTime.now()
        );

        order102 = new OrderDetailsDto(
                102L, "ORD-98422", "TRK-00102", 100L,
                "Ishani Alahakoon", "+94 71 000 1122", "124 Kandy Rd", "Kadawatha",
                "Lanka Book Mart", "+94 11 445 1122", "HIGH", "Books",
                1.1, "25x18x8 cm", "Standard", LocalDateTime.now()
        );

        order103 = new OrderDetailsDto(
                103L, "ORD-98423", "TRK-00103", 100L,
                "Malik Jayasinghe", "+94 76 333 4455", "32 Baseline Rd", "Colombo",
                "Urban Fashion", "+94 11 778 3344", "NORMAL", "Apparel",
                0.8, "35x25x5 cm", "Keep sealed", LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("Test 1 — All candidate orders are unassigned")
    void test1_AllCandidateOrdersUnassigned() {
        when(orderServiceClient.getReadyForDispatchOrders(null, 50))
                .thenReturn(List.of(order101, order102));
        when(assignmentRepository.findActiveOrderIdsByOrderIdIn(Set.of(101L, 102L), UnassignedDeliveryService.ACTIVE_ASSIGNMENT_STATUSES))
                .thenReturn(Collections.emptySet());

        List<UnassignedDeliveryResponse> result = unassignedDeliveryService.getUnassignedDeliveries(null, 50);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getOrderId()).isEqualTo(101L);
        assertThat(result.get(0).getOrderNumber()).isEqualTo("ORD-98421");
        assertThat(result.get(0).getParcelInfo().getWeightKg()).isEqualTo(2.4);
        assertThat(result.get(1).getOrderId()).isEqualTo(102L);
        assertThat(result.get(1).getOrderNumber()).isEqualTo("ORD-98422");
    }

    @Test
    @DisplayName("Test 2 — One order already assigned is excluded")
    void test2_OneOrderAlreadyAssignedExcluded() {
        when(orderServiceClient.getReadyForDispatchOrders(null, 50))
                .thenReturn(List.of(order101, order102, order103));
        // Order 102 has an active assignment
        when(assignmentRepository.findActiveOrderIdsByOrderIdIn(Set.of(101L, 102L, 103L), UnassignedDeliveryService.ACTIVE_ASSIGNMENT_STATUSES))
                .thenReturn(Set.of(102L));

        List<UnassignedDeliveryResponse> result = unassignedDeliveryService.getUnassignedDeliveries(null, 50);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(UnassignedDeliveryResponse::getOrderId)
                .containsExactlyInAnyOrder(101L, 103L);
        assertThat(result).extracting(UnassignedDeliveryResponse::getOrderId)
                .doesNotContain(102L);
    }

    @Test
    @DisplayName("Test 3 — All orders already assigned returns empty list")
    void test3_AllOrdersAlreadyAssigned() {
        when(orderServiceClient.getReadyForDispatchOrders(null, 50))
                .thenReturn(List.of(order101, order102, order103));
        when(assignmentRepository.findActiveOrderIdsByOrderIdIn(Set.of(101L, 102L, 103L), UnassignedDeliveryService.ACTIVE_ASSIGNMENT_STATUSES))
                .thenReturn(Set.of(101L, 102L, 103L));

        List<UnassignedDeliveryResponse> result = unassignedDeliveryService.getUnassignedDeliveries(null, 50);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Test 4 — Historical terminal assignment (DELIVERED) does not exclude order")
    void test4_HistoricalAssignmentDoesNotExcludeOrder() {
        // Order 101 had a DELIVERED assignment, so active query returns empty
        when(orderServiceClient.getReadyForDispatchOrders(null, 50))
                .thenReturn(List.of(order101));
        when(assignmentRepository.findActiveOrderIdsByOrderIdIn(Set.of(101L), UnassignedDeliveryService.ACTIVE_ASSIGNMENT_STATUSES))
                .thenReturn(Collections.emptySet());

        List<UnassignedDeliveryResponse> result = unassignedDeliveryService.getUnassignedDeliveries(null, 50);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOrderId()).isEqualTo(101L);
    }

    @Test
    @DisplayName("Test 5 — Empty Order Service response returns empty list and skips database query")
    void test5_EmptyOrderServiceResponse() {
        when(orderServiceClient.getReadyForDispatchOrders(null, 50))
                .thenReturn(Collections.emptyList());

        List<UnassignedDeliveryResponse> result = unassignedDeliveryService.getUnassignedDeliveries(null, 50);

        assertThat(result).isEmpty();
        verify(assignmentRepository, never()).findActiveOrderIdsByOrderIdIn(any(), any());
    }

    @Test
    @DisplayName("Test 6 — Branch filtering passes branchId to Order Service")
    void test6_BranchFiltering() {
        when(orderServiceClient.getReadyForDispatchOrders(100L, 25))
                .thenReturn(List.of(order101));
        when(assignmentRepository.findActiveOrderIdsByOrderIdIn(Set.of(101L), UnassignedDeliveryService.ACTIVE_ASSIGNMENT_STATUSES))
                .thenReturn(Collections.emptySet());

        List<UnassignedDeliveryResponse> result = unassignedDeliveryService.getUnassignedDeliveries(100L, 25);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOrderId()).isEqualTo(101L);
        verify(orderServiceClient).getReadyForDispatchOrders(100L, 25);
    }

    @Test
    @DisplayName("Test 7 — Order Service unavailable propagates ServiceUnavailableException")
    void test7_OrderServiceUnavailablePropagatesException() {
        when(orderServiceClient.getReadyForDispatchOrders(null, 50))
                .thenThrow(new ServiceUnavailableException("Order Service connection timed out"));

        assertThatThrownBy(() -> unassignedDeliveryService.getUnassignedDeliveries(null, 50))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessageContaining("Order Service connection timed out");

        verify(assignmentRepository, never()).findActiveOrderIdsByOrderIdIn(any(), any());
    }

    @Test
    @DisplayName("Test 8 — Duplicate candidate IDs from Order Service are deduplicated")
    void test8_DuplicateCandidateIdsDeduplicated() {
        // Order Service returns order101 twice
        when(orderServiceClient.getReadyForDispatchOrders(null, 50))
                .thenReturn(List.of(order101, order101, order102));
        when(assignmentRepository.findActiveOrderIdsByOrderIdIn(Set.of(101L, 102L), UnassignedDeliveryService.ACTIVE_ASSIGNMENT_STATUSES))
                .thenReturn(Collections.emptySet());

        List<UnassignedDeliveryResponse> result = unassignedDeliveryService.getUnassignedDeliveries(null, 50);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(UnassignedDeliveryResponse::getOrderId)
                .containsExactly(101L, 102L);
    }

    @Test
    @DisplayName("Test 9 — Limit validation rejects non-positive limits")
    void test9_LimitValidation() {
        assertThatThrownBy(() -> unassignedDeliveryService.getUnassignedDeliveries(null, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Limit must be greater than zero");

        assertThatThrownBy(() -> unassignedDeliveryService.getUnassignedDeliveries(null, -10))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Limit must be greater than zero");

        assertThatThrownBy(() -> unassignedDeliveryService.getUnassignedDeliveries(-1L, 50))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Branch ID must be a positive number");
    }
}

