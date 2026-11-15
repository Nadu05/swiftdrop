package com.swiftdrop.dispatch.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.client.OrderSummaryDto;
import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.exception.IdempotencyConflictException;
import com.swiftdrop.dispatch.repository.*;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import com.swiftdrop.dispatch.service.DispatchEventPublisher;
import com.swiftdrop.dispatch.service.DispatchService;
import com.swiftdrop.dispatch.service.PodEvidenceStorageService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** End-to-end courier workflows against a real (H2) database: lifecycle, POD, failures, idempotency, concurrency. */
@DataJpaTest
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:dispatch_courier_mgmt;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
})
class CourierManagementWorkflowTest {

    @TempDir
    Path tempEvidenceDir;

    @Autowired private CourierProfileRepository courierRepository;
    @Autowired private PickupTaskRepository pickupTaskRepository;
    @Autowired private DeliveryJobRepository deliveryJobRepository;
    @Autowired private CourierAssignmentRepository assignmentRepository;
    @Autowired private DeliveryAttemptRepository attemptRepository;
    @Autowired private ProofOfDeliveryRepository podRepository;
    @Autowired private DeliveryExceptionRepository exceptionRepository;
    @Autowired private DispatchOutboxEventRepository outboxRepository;
    @Autowired private CourierIdempotencyRepository idempotencyRepository;
    @Autowired private EntityManager entityManager;

    private OrderServiceClient orderServiceClient;
    private DispatchService dispatchService;

    private DispatchUserPrincipal dispatcher;
    private DispatchUserPrincipal courier1;
    private DispatchUserPrincipal courier2;

    @BeforeEach
    void setUp() {
        orderServiceClient = mock(OrderServiceClient.class);
        DispatchEventPublisher eventPublisher = new DispatchEventPublisher(
                mock(RabbitTemplate.class), "swiftdrop.events", outboxRepository,
                mock(ApplicationEventPublisher.class), new ObjectMapper());

        dispatchService = new DispatchService(
                courierRepository, pickupTaskRepository, deliveryJobRepository, assignmentRepository,
                attemptRepository, podRepository, exceptionRepository, orderServiceClient,
                new PodEvidenceStorageService(tempEvidenceDir.toString()), eventPublisher);
        ReflectionTestUtils.setField(dispatchService, "idempotencyRepository", idempotencyRepository);
        ReflectionTestUtils.setField(dispatchService, "idempotencyMapper", new ObjectMapper());

        dispatcher = new DispatchUserPrincipal("disp-1", "disp@swiftdrop.lk", List.of("DISPATCHER"), 1L);
        courier1 = new DispatchUserPrincipal("usr-cr-1", "kamal@swiftdrop.lk", List.of("COURIER"), 1L);
        courier2 = new DispatchUserPrincipal("usr-cr-2", "nimal@swiftdrop.lk", List.of("COURIER"), 1L);
        seedCourier("CR-1", "usr-cr-1", "Kamal", "kamal@swiftdrop.lk", 4);
        seedCourier("CR-2", "usr-cr-2", "Nimal", "nimal@swiftdrop.lk", 8);
    }

    // ---------------------------------------------------------------- dashboard & retrieval

    @Test
    void summaryCountsTodaysWorkAndWorkload() {
        String a1 = assign("9001", "SD-90001", "CR-1");
        String a2 = assign("9002", "SD-90002", "CR-1");
        String a3 = assign("9003", "SD-90003", "CR-1");
        assign("9004", "SD-90004", "CR-2"); // belongs to someone else

        dispatchService.acceptAssignment(a1, courier1);
        dispatchService.markPickedUp(a1, courier1);
        dispatchService.completeDelivery(a1, proof("Amaya"), courier1);

        dispatchService.acceptAssignment(a2, courier1);
        dispatchService.markPickedUp(a2, courier1);
        dispatchService.recordFailedDelivery(a2, new FailedDeliveryRequest("No answer", "rang twice"), courier1);

        CourierSummaryDto summary = dispatchService.getMyCourierSummary(null, courier1);
        assertThat(summary.getDate()).isEqualTo(LocalDate.now().toString());
        assertThat(summary.getCompleted()).isEqualTo(1);
        assertThat(summary.getFailed()).isEqualTo(1);
        assertThat(summary.getPending()).isEqualTo(1); // a3 still ASSIGNED
        assertThat(summary.getTotalAssigned()).isEqualTo(3);
        assertThat(summary.getActiveWorkload()).isEqualTo(1);
        assertThat(summary.getMaxConcurrent()).isEqualTo(4);
        assertThat(summary.getWorkloadPercent()).isEqualTo(25);
        assertThat(summary.getWorkloadLevel()).isEqualTo("LOW");
        assertThat(a3).isNotBlank();

        // another day shows no finished work
        CourierSummaryDto yesterday = dispatchService.getMyCourierSummary(LocalDate.now().minusDays(1), courier1);
        assertThat(yesterday.getCompleted()).isZero();
        assertThat(yesterday.getFailed()).isZero();
    }

    @Test
    void courierSeesOnlyOwnJobsAndCanFilterByStatusAndDate() {
        String a1 = assign("9011", "SD-90011", "CR-1");
        assign("9012", "SD-90012", "CR-1");
        assign("9013", "SD-90013", "CR-2");

        dispatchService.acceptAssignment(a1, courier1);

        assertThat(dispatchService.getMyCourierJobs(courier1)).hasSize(2);
        assertThat(dispatchService.getMyCourierJobs(courier2)).hasSize(1);
        assertThat(dispatchService.getMyCourierJobs("ACCEPTED", null, null, courier1))
                .extracting(DeliveryJobDto::getTrackingNumber).containsExactly("SD-90011");
        assertThat(dispatchService.getMyCourierJobs("PENDING", null, null, courier1)).hasSize(2);
        assertThat(dispatchService.getMyCourierJobs("DELIVERED", null, null, courier1)).isEmpty();

        LocalDate today = LocalDate.now();
        assertThat(dispatchService.getMyCourierJobs(null, today, today, courier1)).hasSize(2);
        assertThat(dispatchService.getMyCourierJobs(null, today.plusDays(1), null, courier1)).isEmpty();
        assertThat(dispatchService.getMyCourierJobs(null, null, today.minusDays(1), courier1)).isEmpty();

        assertThatThrownBy(() -> dispatchService.getMyCourierJobs("BOGUS", null, null, courier1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> dispatchService.getMyCourierJobs(null, today, today.minusDays(1), courier1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void jobDetailShowsRecipientAddressAndIsRestrictedToTheOwner() {
        String a1 = assign("9021", "SD-90021", "CR-1");

        DeliveryJobDto detail = dispatchService.getMyCourierJobDetail(a1, courier1);
        assertThat(detail.getOrderId()).isEqualTo("9021");
        assertThat(detail.getRecipient().getName()).isEqualTo("Amaya");
        assertThat(detail.getDeliveryAddress()).contains("Peradeniya");
        assertThat(detail.getStatus()).isEqualTo("ASSIGNED");

        assertThatThrownBy(() -> dispatchService.getMyCourierJobDetail(a1, courier2))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> dispatchService.getMyCourierJobDetail(a1, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ---------------------------------------------------------------- authorization

    @Test
    void courierCannotUpdateAnotherCouriersDelivery() {
        String a1 = assign("9031", "SD-90031", "CR-1");

        assertThatThrownBy(() -> dispatchService.acceptAssignment(a1, courier2)).isInstanceOf(AccessDeniedException.class);
        dispatchService.acceptAssignment(a1, courier1);
        assertThatThrownBy(() -> dispatchService.markPickedUp(a1, courier2)).isInstanceOf(AccessDeniedException.class);
        dispatchService.markPickedUp(a1, courier1);
        assertThatThrownBy(() -> dispatchService.completeDelivery(a1, proof("Amaya"), courier2))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("x", null), courier2))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(assignmentRepository.findByAssignmentCodeIgnoreCase(a1).orElseThrow().getStatus())
                .isEqualTo(AssignmentStatus.IN_TRANSIT);
    }

    // ---------------------------------------------------------------- status transitions

    @Test
    void allowedActionsFollowTheLifecycle() {
        String a1 = assign("9041", "SD-90041", "CR-1");

        assertThat(dispatchService.getMyCourierJobDetail(a1, courier1).getAllowedActions()).containsExactly("ACCEPT");
        dispatchService.acceptAssignment(a1, courier1);
        assertThat(dispatchService.getMyCourierJobDetail(a1, courier1).getAllowedActions()).containsExactly("PICKUP");
        dispatchService.markPickedUp(a1, courier1);
        assertThat(dispatchService.getMyCourierJobDetail(a1, courier1).getAllowedActions())
                .containsExactly("DELIVER", "FAIL");
        dispatchService.completeDelivery(a1, proof("Amaya"), courier1);
        assertThat(dispatchService.getMyCourierJobDetail(a1, courier1).getAllowedActions()).isEmpty();
    }

    @Test
    void invalidTransitionsAreRejectedForCouriers() {
        String a1 = assign("9051", "SD-90051", "CR-1");

        assertThatThrownBy(() -> dispatchService.markPickedUp(a1, courier1))
                .isInstanceOf(DispatchValidationException.class).hasMessageContaining("PICKUP");
        assertThatThrownBy(() -> dispatchService.completeDelivery(a1, proof("Amaya"), courier1))
                .isInstanceOf(DispatchValidationException.class).hasMessageContaining("DELIVER");
        assertThatThrownBy(() -> dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("No answer", null), courier1))
                .isInstanceOf(DispatchValidationException.class).hasMessageContaining("FAIL");

        dispatchService.acceptAssignment(a1, courier1);
        assertThatThrownBy(() -> dispatchService.acceptAssignment(a1, courier1))
                .isInstanceOf(DispatchValidationException.class);
        assertThatThrownBy(() -> dispatchService.completeDelivery(a1, proof("Amaya"), courier1))
                .isInstanceOf(DispatchValidationException.class);

        dispatchService.markPickedUp(a1, courier1);
        dispatchService.completeDelivery(a1, proof("Amaya"), courier1);
        assertThatThrownBy(() -> dispatchService.acceptAssignment(a1, courier1))
                .isInstanceOf(DispatchValidationException.class);
        assertThatThrownBy(() -> dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("late", null), courier1))
                .isInstanceOf(DispatchValidationException.class);
        assertThat(assignmentRepository.findByAssignmentCodeIgnoreCase(a1).orElseThrow().getStatus())
                .isEqualTo(AssignmentStatus.DELIVERED);
    }

    // ---------------------------------------------------------------- proof of delivery / failure

    @Test
    void deliveryRequiresProofAndRecipientName() {
        String a1 = startedJob("9061", "SD-90061");

        ProofOfDeliveryRequest noEvidence = new ProofOfDeliveryRequest();
        noEvidence.setRecipientName("Amaya");
        assertThatThrownBy(() -> dispatchService.completeDelivery(a1, noEvidence, courier1))
                .isInstanceOf(IllegalArgumentException.class);

        ProofOfDeliveryRequest noName = new ProofOfDeliveryRequest();
        noName.setProofType("PHOTO");
        noName.setPhotoEvidenceReference("https://files.example/pod.jpg");
        assertThatThrownBy(() -> dispatchService.completeDelivery(a1, noName, courier1))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(deliveryJobRepository.findByOrderId("9061").orElseThrow().getStatus())
                .isEqualTo(DeliveryJobStatus.IN_TRANSIT);
        assertThat(podRepository.findByOrderId("9061")).isEmpty();

        DeliveryJobDto done = dispatchService.completeDelivery(a1, proof("Amaya"), courier1);
        assertThat(done.getStatus()).isEqualTo("DELIVERED");
        assertThat(done.getProofOfDelivery().getReceivedBy()).isEqualTo("Amaya");
        assertThat(done.getProofOfDelivery().getDeliveredAt()).isNotBlank();
        assertThat(podRepository.findByOrderId("9061")).isPresent();
    }

    @Test
    void failedDeliveryRequiresReasonKeepsHistoryAndIsNeverMarkedDelivered() {
        String a1 = startedJob("9071", "SD-90071");

        assertThatThrownBy(() -> dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("  ", "n"), courier1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(attemptRepository.findByOrderIdOrderByAttemptNumberAsc("9071")).isEmpty();

        DeliveryJobDto first = dispatchService.recordFailedDelivery(
                a1, new FailedDeliveryRequest("Recipient not home", "left a note"), courier1);
        assertThat(first.getStatus()).isEqualTo("FAILED");
        assertThat(first.getProofOfDelivery()).isNull();
        assertThat(first.getAttemptCount()).isEqualTo(1);

        DeliveryJobDto second = dispatchService.recordFailedDelivery(
                a1, new FailedDeliveryRequest("Gate locked", "no bell"), courier1);
        assertThat(second.getAttempts()).hasSize(2);
        assertThat(second.getAttempts()).extracting(DeliveryJobDto.AttemptRecordDto::getFailureReason)
                .containsExactly("Recipient not home", "Gate locked");
        assertThat(second.getAttempts()).extracting(DeliveryJobDto.AttemptRecordDto::getNotes)
                .containsExactly("left a note", "no bell");
        assertThat(second.getAttempts()).allSatisfy(a -> {
            assertThat(a.getOutcome()).isEqualTo("FAILED");
            assertThat(a.getAttemptedAt()).isNotBlank();
        });
        assertThat(podRepository.findByOrderId("9071")).isEmpty();
    }

    @Test
    void thirdFailureEscalatesToDispatcherAndBlocksFurtherCourierActions() {
        String a1 = startedJob("9081", "SD-90081");
        dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("r1", null), courier1);
        dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("r2", null), courier1);
        dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("r3", null), courier1);

        assertThat(deliveryJobRepository.findByOrderId("9081").orElseThrow().getStatus())
                .isEqualTo(DeliveryJobStatus.PENDING_DISPATCHER_DECISION);
        assertThat(dispatchService.getMyCourierJobDetail(a1, courier1).getAllowedActions()).isEmpty();
        assertThatThrownBy(() -> dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("r4", null), courier1))
                .isInstanceOf(DispatchValidationException.class);
        assertThatThrownBy(() -> dispatchService.completeDelivery(a1, proof("Amaya"), courier1))
                .isInstanceOf(DispatchValidationException.class);
    }

    // ---------------------------------------------------------------- POD photo upload

    @Test
    void podPhotoUploadValidatesTypeSizeAndOwnership() {
        String a1 = startedJob("9091", "SD-90091");
        byte[] png = new byte[]{(byte) 0x89, 'P', 'N', 'G', 1, 2, 3};

        String ref = dispatchService.storeCourierPodPhoto(a1, png, "image/png", courier1);
        assertThat(ref).startsWith("pod-storage://photo/");

        assertThatThrownBy(() -> dispatchService.storeCourierPodPhoto(a1, png, "application/pdf", courier1))
                .isInstanceOf(DispatchValidationException.class);
        assertThatThrownBy(() -> dispatchService.storeCourierPodPhoto(a1, new byte[0], "image/png", courier1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> dispatchService.storeCourierPodPhoto(a1, new byte[6 * 1024 * 1024], "image/png", courier1))
                .isInstanceOf(DispatchValidationException.class);
        assertThatThrownBy(() -> dispatchService.storeCourierPodPhoto(a1, png, "image/png", courier2))
                .isInstanceOf(AccessDeniedException.class);

        ProofOfDeliveryRequest req = new ProofOfDeliveryRequest();
        req.setRecipientName("Amaya");
        req.setProofType("PHOTO");
        req.setPhotoEvidenceReference(ref);
        assertThat(dispatchService.completeDelivery(a1, req, courier1).getProofOfDelivery().getPhotoEvidenceReference())
                .isEqualTo(ref);
    }

    // ---------------------------------------------------------------- duplicates & concurrency

    @Test
    void repeatedDeliverRequestWithSameKeyIsReplayedWithoutDoubleRecording() {
        String a1 = startedJob("9101", "SD-90101");
        ProofOfDeliveryRequest req = proof("Amaya");

        DeliveryJobDto first = dispatchService.completeDelivery(a1, req, courier1, "key-deliver-1");
        DeliveryJobDto replay = dispatchService.completeDelivery(a1, req, courier1, "key-deliver-1");

        assertThat(replay.getStatus()).isEqualTo("DELIVERED");
        assertThat(replay.getAttemptCount()).isEqualTo(first.getAttemptCount()).isEqualTo(1);
        assertThat(attemptRepository.findByOrderIdOrderByAttemptNumberAsc("9101")).hasSize(1);
        assertThat(idempotencyRepository.findAll()).hasSize(1);
        assertThat(outboxRepository.findAll().stream().filter(e -> "DeliveryCompleted".equals(e.getEventType())))
                .hasSize(1);
    }

    @Test
    void sameKeyWithDifferentPayloadIsRejected() {
        String a1 = startedJob("9111", "SD-90111");
        dispatchService.recordFailedDelivery(a1, new FailedDeliveryRequest("No answer", null), courier1, "key-x");

        assertThatThrownBy(() -> dispatchService.recordFailedDelivery(
                a1, new FailedDeliveryRequest("Different reason", null), courier1, "key-x"))
                .isInstanceOf(IdempotencyConflictException.class);
        assertThat(attemptRepository.findByOrderIdOrderByAttemptNumberAsc("9111")).hasSize(1);
    }

    @Test
    void repeatedFailRequestWithSameKeyCountsOneAttempt() {
        String a1 = startedJob("9121", "SD-90121");
        FailedDeliveryRequest req = new FailedDeliveryRequest("No answer", "x");

        dispatchService.recordFailedDelivery(a1, req, courier1, "key-fail-1");
        dispatchService.recordFailedDelivery(a1, req, courier1, "key-fail-1");

        assertThat(deliveryJobRepository.findByOrderId("9121").orElseThrow().getAttemptCount()).isEqualTo(1);
        assertThat(outboxRepository.findAll().stream().filter(e -> "DeliveryAttemptFailed".equals(e.getEventType())))
                .hasSize(1);
    }

    @Test
    void requestWithoutKeyStillRejectsSecondDelivery() {
        String a1 = startedJob("9131", "SD-90131");
        dispatchService.completeDelivery(a1, proof("Amaya"), courier1);

        assertThatThrownBy(() -> dispatchService.completeDelivery(a1, proof("Amaya"), courier1))
                .isInstanceOf(DispatchValidationException.class);
        assertThat(attemptRepository.findByOrderIdOrderByAttemptNumberAsc("9131")).hasSize(1);
    }

    @Test
    void staleConcurrentUpdateIsRejectedByOptimisticLocking() {
        String a1 = assign("9141", "SD-90141", "CR-1");
        entityManager.flush();
        entityManager.clear();

        CourierAssignment stale = assignmentRepository.findByAssignmentCodeIgnoreCase(a1).orElseThrow();
        entityManager.detach(stale);

        dispatchService.acceptAssignment(a1, courier1); // a concurrent request wins and bumps the version
        entityManager.flush();
        entityManager.clear();

        stale.setStatus(AssignmentStatus.CANCELLED);
        assertThatThrownBy(() -> {
            assignmentRepository.saveAndFlush(stale);
            entityManager.flush();
        }).isInstanceOf(ObjectOptimisticLockingFailureException.class);
        assertThat(assignmentRepository.findByAssignmentCodeIgnoreCase(a1).orElseThrow().getStatus())
                .isEqualTo(AssignmentStatus.ACCEPTED);
    }

    // ---------------------------------------------------------------- complete workflows + events

    @Test
    void fullDeliveredWorkflowPublishesStatusAndCompletionEvents() {
        String a1 = assign("9201", "SD-90201", "CR-1");

        dispatchService.acceptAssignment(a1, courier1, "k1");
        dispatchService.markPickedUp(a1, courier1, "k2");
        DeliveryJobDto done = dispatchService.completeDelivery(a1, proof("Amaya"), courier1, "k3");

        assertThat(done.getStatus()).isEqualTo("DELIVERED");
        assertThat(done.getCompletedAt()).isNotBlank();
        assertThat(outboxRepository.findAll()).extracting(DispatchOutboxEvent::getEventType)
                .contains("OutForDelivery", "DeliveryCompleted");
    }

    @Test
    void fullFailedWorkflowPublishesFailureEventAndNeverDelivers() {
        String a1 = assign("9211", "SD-90211", "CR-1");

        dispatchService.acceptAssignment(a1, courier1);
        dispatchService.markPickedUp(a1, courier1);
        DeliveryJobDto failed = dispatchService.recordFailedDelivery(
                a1, new FailedDeliveryRequest("Address not found", "called twice"), courier1);

        assertThat(failed.getStatus()).isEqualTo("FAILED");
        assertThat(failed.getAllowedActions()).containsExactly("DELIVER", "FAIL"); // retry allowed until 3 attempts
        assertThat(outboxRepository.findAll()).extracting(DispatchOutboxEvent::getEventType)
                .contains("DeliveryAttemptFailed").doesNotContain("DeliveryCompleted");
        assertThat(podRepository.findByOrderId("9211")).isEmpty();
    }

    // ---------------------------------------------------------------- helpers

    /** Creates a same-branch delivery job for the order and assigns it to the courier; returns the assignment code. */
    private String assign(String orderId, String tracking, String courierCode) {
        mockOrder(orderId, tracking);
        BranchDropoffConfirmRequest dropoff = new BranchDropoffConfirmRequest();
        dropoff.setOrderId(orderId);
        dropoff.setTrackingNumber(tracking);
        dropoff.setBranchId(1L);
        dropoff.setBranchCode("CMB");
        dropoff.setBranchName("Colombo Central");
        dropoff.setEmployeeId("EMP-1");
        dropoff.setEmployeeName("Front Desk");
        dropoff.setParcelReference("PRC-" + tracking);
        dispatchService.confirmBranchDropoff(dropoff, dispatcher);

        DeliveryJob job = deliveryJobRepository.findByOrderId(orderId).orElseThrow();
        AssignCourierRequest req = new AssignCourierRequest();
        req.setOrderId(orderId);
        req.setDeliveryJobId(job.getId());
        req.setTaskType("DELIVERY");
        req.setCourierId(courierCode);
        return dispatchService.assignCourier(req, dispatcher).getAssignmentCode();
    }

    /** Assigned to CR-1, accepted and picked up (IN_TRANSIT). */
    private String startedJob(String orderId, String tracking) {
        String code = assign(orderId, tracking, "CR-1");
        dispatchService.acceptAssignment(code, courier1);
        dispatchService.markPickedUp(code, courier1);
        return code;
    }

    private ProofOfDeliveryRequest proof(String recipient) {
        ProofOfDeliveryRequest req = new ProofOfDeliveryRequest();
        req.setRecipientName(recipient);
        req.setProofType("PHOTO");
        req.setPhotoEvidenceReference("https://files.example/pod-" + recipient + ".jpg");
        req.setNotes("handed over at the door");
        return req;
    }

    private void mockOrder(String orderId, String tracking) {
        OrderSummaryDto s = new OrderSummaryDto();
        s.setOrderId(orderId);
        s.setTrackingNumber(tracking);
        s.setStatus("CONFIRMED");
        s.setPickupMethod("COURIER_PICKUP");
        s.setOriginBranchId(1L);
        s.setOriginBranchCode("CMB");
        s.setOriginBranchName("Colombo Central");
        s.setDestinationBranchId(1L);
        s.setDestinationBranchCode("CMB");
        s.setDestinationBranchName("Colombo Central");
        s.setSameBranch(true);
        s.setPickupAddress("120 Galle Rd, Colombo");
        s.setPickupContactName("Kasun");
        s.setPickupContactPhone("+94771112222");
        s.setDropoffAddress("45 Peradeniya Rd, Kandy");
        s.setDropoffContactName("Amaya");
        s.setDropoffContactPhone("+94773334444");
        s.setWeightKg(new BigDecimal("2.50"));
        s.setDeliveryFee(new BigDecimal("1450.00"));
        when(orderServiceClient.getOrderByIdOrTracking(eq(orderId))).thenReturn(s);
        when(orderServiceClient.getOrderByIdOrTracking(eq(tracking))).thenReturn(s);
    }

    private void seedCourier(String code, String userId, String name, String email, int capacity) {
        CourierProfileEntity c = new CourierProfileEntity();
        c.setCourierCode(code);
        c.setUserId(userId);
        c.setName(name);
        c.setPhone("+94771000000");
        c.setEmail(email);
        c.setVehicleType(VehicleType.VAN);
        c.setVehiclePlate("WP-" + code);
        c.setBranchId(1L);
        c.setBranchCode("CMB");
        c.setBranchName("Colombo Central");
        c.setZone("Zone A");
        c.setAvailabilityStatus(CourierAvailabilityStatus.AVAILABLE);
        c.setMaxCapacity(capacity);
        courierRepository.save(c);
    }
}
