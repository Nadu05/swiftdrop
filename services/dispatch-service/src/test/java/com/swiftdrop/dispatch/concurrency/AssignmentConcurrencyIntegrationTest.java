package com.swiftdrop.dispatch.concurrency;

import com.swiftdrop.dispatch.client.OrderServiceClient;
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
import com.swiftdrop.dispatch.repository.AssignmentHistoryRepository;
import com.swiftdrop.dispatch.repository.AssignmentRepository;
import com.swiftdrop.dispatch.repository.CourierRepository;
import com.swiftdrop.dispatch.service.AssignmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class AssignmentConcurrencyIntegrationTest {

    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private CourierRepository courierRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentHistoryRepository assignmentHistoryRepository;

    @MockBean
    private OrderServiceClient orderServiceClient;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @BeforeEach
    void cleanUp() {
        assignmentHistoryRepository.deleteAll();
        assignmentRepository.deleteAll();
        courierRepository.deleteAll();
    }

    private Courier createCourier(String code, CourierStatus status, int maxCapacity) {
        Courier courier = new Courier();
        courier.setCourierCode(code);
        courier.setName("Courier " + code);
        courier.setPhone("+94 77 000 0000");
        courier.setStatus(status);
        courier.setVehicleType(VehicleType.MOTORCYCLE);
        courier.setBranchId(100L);
        courier.setMaxCapacity(maxCapacity);
        courier.setCreatedAt(LocalDateTime.now());
        courier.setUpdatedAt(LocalDateTime.now());
        return courierRepository.save(courier);
    }

    @Test
    @DisplayName("Scenario 1 — Two simultaneous requests assigning the same order: exactly one succeeds")
    void test1_ConcurrentAssignmentSameOrder() throws Exception {
        Courier courier = createCourier("CR-CONC-1", CourierStatus.AVAILABLE, 5);
        Long orderId = 501L;

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        List<AssignmentResponse> successes = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    AssignmentResponse response = assignmentService.createAssignment(
                            new AssignmentRequest(orderId, courier.getId()));
                    successes.add(response);
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Fire both threads simultaneously
        startLatch.countDown();
        boolean completed = finishLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(successes).hasSize(1);
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0)).isInstanceOf(DuplicateAssignmentException.class);

        // Verify only 1 active assignment is in the database for this order
        List<Assignment> savedAssignments = assignmentRepository.findByOrderId(orderId);
        assertThat(savedAssignments).hasSize(1);
        assertThat(savedAssignments.get(0).getStatus()).isEqualTo(AssignmentStatus.ASSIGNED);
    }

    @Test
    @DisplayName("Scenario 2 — Two simultaneous requests for final available capacity: exactly one succeeds")
    void test2_ConcurrentAssignmentFinalCapacity() throws Exception {
        // Courier has maxCapacity 2, but already has 1 active assignment -> 1 slot remaining
        Courier courier = createCourier("CR-CONC-2", CourierStatus.AVAILABLE, 2);

        // Seed 1 active assignment
        Assignment existing = new Assignment();
        existing.setAssignmentCode("ASN-SEED-01");
        existing.setOrderId(600L);
        existing.setCourier(courier);
        existing.setBranchId(courier.getBranchId());
        existing.setStatus(AssignmentStatus.ASSIGNED);
        existing.setAssignedAt(LocalDateTime.now());
        assignmentRepository.save(existing);

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        List<AssignmentResponse> successes = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        // Thread 1 tries to assign Order 601, Thread 2 tries to assign Order 602
        Long[] orders = new Long[]{601L, 602L};
        for (int i = 0; i < threadCount; i++) {
            final Long orderId = orders[i];
            executor.submit(() -> {
                try {
                    startLatch.await();
                    AssignmentResponse response = assignmentService.createAssignment(
                            new AssignmentRequest(orderId, courier.getId()));
                    successes.add(response);
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = finishLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(successes).hasSize(1);
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0)).isInstanceOf(CourierNotAvailableException.class)
                .hasMessageContaining("Courier has reached maximum delivery capacity");

        // Total active deliveries for this courier must equal exactly 2 (never exceeded!)
        long totalActive = assignmentRepository.countByCourierIdAndStatusIn(
                courier.getId(), AssignmentService.ACTIVE_ASSIGNMENT_STATUSES);
        assertThat(totalActive).isEqualTo(2L);
    }

    @Test
    @DisplayName("Scenario 3 — Multiple concurrent requests within capacity: all succeed")
    void test3_MultipleConcurrentRequestsWithinCapacity() throws Exception {
        Courier courier = createCourier("CR-CONC-3", CourierStatus.AVAILABLE, 5);

        int threadCount = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        List<AssignmentResponse> successes = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        Long[] orders = new Long[]{701L, 702L, 703L};
        for (int i = 0; i < threadCount; i++) {
            final Long orderId = orders[i];
            executor.submit(() -> {
                try {
                    startLatch.await();
                    AssignmentResponse response = assignmentService.createAssignment(
                            new AssignmentRequest(orderId, courier.getId()));
                    successes.add(response);
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = finishLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(successes).hasSize(3);
        assertThat(errors).isEmpty();

        long totalActive = assignmentRepository.countByCourierIdAndStatusIn(
                courier.getId(), AssignmentService.ACTIVE_ASSIGNMENT_STATUSES);
        assertThat(totalActive).isEqualTo(3L);
    }

    @Test
    @DisplayName("Scenario 4 — Transaction rollback when assignment creation fails")
    void test4_TransactionRollbackOnFailure() {
        Courier courier = createCourier("CR-CONC-4", CourierStatus.OFFLINE, 5);

        assertThatThrownBy(() -> assignmentService.createAssignment(new AssignmentRequest(801L, courier.getId())))
                .isInstanceOf(CourierNotAvailableException.class);

        // Verify zero assignments and zero history records created in database
        assertThat(assignmentRepository.findAll()).isEmpty();
        assertThat(assignmentHistoryRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("Scenario 5 — Assignment history consistency")
    void test5_AssignmentHistoryConsistency() {
        Courier courier = createCourier("CR-CONC-5", CourierStatus.AVAILABLE, 5);

        AssignmentResponse response = assignmentService.createAssignment(new AssignmentRequest(901L, courier.getId()));

        List<AssignmentHistory> historyList = assignmentHistoryRepository.findByAssignmentId(response.getId());
        assertThat(historyList).hasSize(1);

        AssignmentHistory history = historyList.get(0);
        assertThat(history.getAssignment().getId()).isEqualTo(response.getId());
        assertThat(history.getPreviousCourier()).isNull();
        assertThat(history.getNewCourier().getId()).isEqualTo(courier.getId());
        assertThat(history.getChangeReason()).isEqualTo("Initial dispatch allocation");
        assertThat(history.getChangedAt()).isNotNull();
    }

    @Test
    @DisplayName("Scenario 6 — Concurrent reassignments targeting last available capacity slot: exactly one succeeds")
    void test6_ConcurrentReassignmentCapacityProtection() throws Exception {
        Courier courierA = createCourier("CR-REASSIGN-A", CourierStatus.AVAILABLE, 5);
        Courier courierB = createCourier("CR-REASSIGN-B", CourierStatus.AVAILABLE, 1); // Capacity 1 only

        // Create two active assignments for courierA
        AssignmentResponse a1 = assignmentService.createAssignment(new AssignmentRequest(950L, courierA.getId()));
        AssignmentResponse a2 = assignmentService.createAssignment(new AssignmentRequest(951L, courierA.getId()));

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        List<AssignmentResponse> successes = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        // Thread 1 reassigns assignment a1 to courierB
        executor.submit(() -> {
            try {
                startLatch.await();
                AssignmentResponse response = assignmentService.reassignCourier(
                        a1.getId(),
                        new com.swiftdrop.dispatch.dto.AssignmentReassignRequest(courierB.getId(), "Reassign 1")
                );
                successes.add(response);
            } catch (Throwable t) {
                errors.add(t);
            } finally {
                finishLatch.countDown();
            }
        });

        // Thread 2 reassigns assignment a2 to courierB
        executor.submit(() -> {
            try {
                startLatch.await();
                AssignmentResponse response = assignmentService.reassignCourier(
                        a2.getId(),
                        new com.swiftdrop.dispatch.dto.AssignmentReassignRequest(courierB.getId(), "Reassign 2")
                );
                successes.add(response);
            } catch (Throwable t) {
                errors.add(t);
            } finally {
                finishLatch.countDown();
            }
        });

        startLatch.countDown();
        boolean completed = finishLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(successes).hasSize(1);
        assertThat(errors).hasSize(1);

        Throwable error = errors.get(0);
        assertThat(error).isInstanceOf(CourierNotAvailableException.class)
                .hasMessageContaining("Courier has reached maximum delivery capacity");

        // Courier B must strictly hold exactly 1 active assignment
        long courierBActive = assignmentRepository.countByCourierIdAndStatusIn(
                courierB.getId(), AssignmentService.ACTIVE_ASSIGNMENT_STATUSES);
        assertThat(courierBActive).isEqualTo(1L);

        // Courier A still has the remaining 1 active assignment
        long courierAActive = assignmentRepository.countByCourierIdAndStatusIn(
                courierA.getId(), AssignmentService.ACTIVE_ASSIGNMENT_STATUSES);
        assertThat(courierAActive).isEqualTo(1L);
    }
}

