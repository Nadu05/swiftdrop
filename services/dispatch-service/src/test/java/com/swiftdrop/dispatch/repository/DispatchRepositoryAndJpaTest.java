package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.AssignmentHistory;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.OutboxEvent;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.entity.enums.OutboxStatus;
import com.swiftdrop.dispatch.entity.enums.VehicleType;
import com.swiftdrop.dispatch.service.AssignmentService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@ActiveProfiles("test")
class DispatchRepositoryAndJpaTest {

    @Autowired
    private CourierRepository courierRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentHistoryRepository assignmentHistoryRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private EntityManager entityManager;

    private Courier persistCourier(String code, Long userId, Long branchId, CourierStatus status) {
        Courier courier = new Courier(
                code,
                userId,
                "Courier " + code,
                "+94770000001",
                status,
                VehicleType.MOTORCYCLE,
                "WP-" + code,
                branchId,
                5
        );
        return courierRepository.saveAndFlush(courier);
    }

    private Assignment persistAssignment(String code, Long orderId, Courier courier, AssignmentStatus status) {
        Assignment assignment = new Assignment();
        assignment.setAssignmentCode(code);
        assignment.setOrderId(orderId);
        assignment.setCourier(courier);
        assignment.setBranchId(courier.getBranchId());
        assignment.setStatus(status);
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setAssignedBy(1L);
        return assignmentRepository.saveAndFlush(assignment);
    }

    @Test
    @DisplayName("Should enforce unique constraints on courier_code, user_id, and assignment_code")
    void shouldEnforceUniqueConstraints() {
        Courier first = persistCourier("CR-U01", 1001L, 10L, CourierStatus.AVAILABLE);
        persistAssignment("ASN-U01", 5001L, first, AssignmentStatus.ASSIGNED);

        Courier duplicateCode = new Courier(
                "CR-U01", 1002L, "Dup", "+94770000002",
                CourierStatus.AVAILABLE, VehicleType.VAN, "WP-DUP", 10L, 5
        );
        assertThatThrownBy(() -> courierRepository.saveAndFlush(duplicateCode))
                .isInstanceOf(DataIntegrityViolationException.class);
        entityManager.clear();

        Assignment duplicateAssignCode = new Assignment();
        duplicateAssignCode.setAssignmentCode("ASN-U01");
        duplicateAssignCode.setOrderId(5002L);
        duplicateAssignCode.setCourier(courierRepository.findById(first.getId()).orElseThrow());
        duplicateAssignCode.setBranchId(10L);
        duplicateAssignCode.setStatus(AssignmentStatus.ASSIGNED);
        duplicateAssignCode.setAssignedAt(LocalDateTime.now());
        duplicateAssignCode.setAssignedBy(1L);
        assertThatThrownBy(() -> assignmentRepository.saveAndFlush(duplicateAssignCode))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Should filter assignments dynamically and identify active order IDs accurately")
    void shouldFilterAssignmentsAndDetectActiveOrders() {
        Courier c1 = persistCourier("CR-F01", 2001L, 100L, CourierStatus.AVAILABLE);
        Courier c2 = persistCourier("CR-F02", 2002L, 200L, CourierStatus.BUSY);

        persistAssignment("ASN-F01", 6001L, c1, AssignmentStatus.ASSIGNED);
        persistAssignment("ASN-F02", 6002L, c1, AssignmentStatus.DELIVERED);
        persistAssignment("ASN-F03", 6003L, c2, AssignmentStatus.IN_TRANSIT);

        entityManager.flush();
        entityManager.clear();

        List<Assignment> c1Active = assignmentRepository.findWithFilters(c1.getId(), 100L, AssignmentStatus.ASSIGNED, null);
        assertThat(c1Active).hasSize(1);
        assertThat(c1Active.get(0).getOrderId()).isEqualTo(6001L);
        assertThat(c1Active.get(0).getCourier().getCourierCode()).isEqualTo("CR-F01");

        Set<Long> activeOrderIds = assignmentRepository.findActiveOrderIdsByOrderIdIn(
                List.of(6001L, 6002L, 6003L, 6004L),
                AssignmentService.ACTIVE_ASSIGNMENT_STATUSES
        );
        assertThat(activeOrderIds).containsExactlyInAnyOrder(6001L, 6003L);
        assertThat(assignmentRepository.countByCourierIdAndStatusIn(c1.getId(), AssignmentService.ACTIVE_ASSIGNMENT_STATUSES))
                .isEqualTo(1L);
    }

    @Test
    @DisplayName("Should return chronological assignment history and prevent deleting referenced assignments")
    void shouldPersistChronologicalHistoryAndEnforceForeignKey() {
        Courier c1 = persistCourier("CR-H01", 3001L, 100L, CourierStatus.AVAILABLE);
        Courier c2 = persistCourier("CR-H02", 3002L, 100L, CourierStatus.AVAILABLE);
        Assignment assignment = persistAssignment("ASN-H01", 7001L, c1, AssignmentStatus.ASSIGNED);

        AssignmentHistory h1 = new AssignmentHistory(assignment, null, c1, 1L, "Initial assignment");
        assignmentHistoryRepository.saveAndFlush(h1);

        assignment.setCourier(c2);
        assignmentRepository.saveAndFlush(assignment);
        AssignmentHistory h2 = new AssignmentHistory(assignment, c1, c2, 2L, "Reassigned to CR-H02");
        assignmentHistoryRepository.saveAndFlush(h2);

        entityManager.flush();
        entityManager.clear();

        List<AssignmentHistory> chronological = assignmentHistoryRepository
                .findHistoryByAssignmentIdChronological(assignment.getId());
        assertThat(chronological).hasSize(2);
        assertThat(chronological.get(0).getPreviousCourier()).isNull();
        assertThat(chronological.get(0).getNewCourier().getCourierCode()).isEqualTo("CR-H01");
        assertThat(chronological.get(1).getPreviousCourier().getCourierCode()).isEqualTo("CR-H01");
        assertThat(chronological.get(1).getNewCourier().getCourierCode()).isEqualTo("CR-H02");

        // Deleting an assignment referenced by assignment_history must fail due to FK constraint
        assertThatThrownBy(() -> {
            entityManager.createNativeQuery("DELETE FROM assignments WHERE id = :id")
                    .setParameter("id", assignment.getId())
                    .executeUpdate();
            entityManager.flush();
        }).isInstanceOf(PersistenceException.class);
    }

    @Test
    @DisplayName("Should enforce unique outbox event_id and retrieve pending/failed retryable events")
    void shouldPersistAndQueryOutboxEvents() {
        OutboxEvent pending = new OutboxEvent(
                "evt-out-1", "dispatch.courier.assigned", 1,
                "dispatch.courier.assigned.v1", "{\"eventId\":\"evt-out-1\"}",
                LocalDateTime.now().minusMinutes(2)
        );
        OutboxEvent deadLetter = new OutboxEvent(
                "evt-out-2", "dispatch.courier.assigned", 1,
                "dispatch.courier.assigned.v1", "{\"eventId\":\"evt-out-2\"}",
                LocalDateTime.now().minusMinutes(1)
        );
        deadLetter.setStatus(OutboxStatus.DEAD_LETTER);
        deadLetter.setRetryCount(5);

        outboxEventRepository.saveAndFlush(pending);
        outboxEventRepository.saveAndFlush(deadLetter);

        List<OutboxEvent> toProcess = outboxEventRepository.findPendingForProcessing(
                Set.of(OutboxStatus.PENDING, OutboxStatus.FAILED),
                PageRequest.of(0, 10)
        );
        assertThat(toProcess).hasSize(1);
        assertThat(toProcess.get(0).getEventId()).isEqualTo("evt-out-1");

        OutboxEvent duplicate = new OutboxEvent(
                "evt-out-1", "dispatch.courier.assigned", 1,
                "dispatch.courier.assigned.v1", "{}", LocalDateTime.now()
        );
        assertThatThrownBy(() -> outboxEventRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}

