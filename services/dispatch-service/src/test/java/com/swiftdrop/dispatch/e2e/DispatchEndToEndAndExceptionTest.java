package com.swiftdrop.dispatch.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.client.OrderSummaryDto;
import com.swiftdrop.dispatch.config.CorrelationIdHolder;
import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.repository.*;
import com.swiftdrop.dispatch.security.DispatchJwtService;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import com.swiftdrop.dispatch.service.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.MDC;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.TestPropertySource;

import javax.crypto.SecretKey;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:dispatch_e2e;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
})
class DispatchEndToEndAndExceptionTest {

    @TempDir
    Path tempEvidenceDir;

    @Autowired private CourierProfileRepository courierRepository;
    @Autowired private PickupTaskRepository pickupTaskRepository;
    @Autowired private DeliveryJobRepository deliveryJobRepository;
    @Autowired private CourierAssignmentRepository assignmentRepository;
    @Autowired private DeliveryAttemptRepository attemptRepository;
    @Autowired private ProofOfDeliveryRepository podRepository;
    @Autowired private DeliveryExceptionRepository exceptionRepository;
    @Autowired private TransferManifestRepository manifestRepository;
    @Autowired private TransferManifestParcelRepository manifestParcelRepository;
    @Autowired private ReturnTaskRepository returnTaskRepository;
    @Autowired private ParcelCustodyRecordRepository custodyRepository;
    @Autowired private DispatchOutboxEventRepository outboxRepository;
    @Autowired private DispatchProcessedEventRepository processedEventRepository;

    private RabbitTemplate rabbitTemplate;
    private ApplicationEventPublisher applicationEventPublisher;
    private OrderServiceClient orderServiceClient;

    private DispatchEventPublisher eventPublisher;
    private DispatchService dispatchService;
    private CustodyTrackingService custodyTrackingService;
    private ReturnTaskService returnTaskService;
    private OperationalExceptionService operationalExceptionService;
    private TransferManifestService transferManifestService;
    private OrderEventListener orderEventListener;

    private DispatchUserPrincipal originDispatcher;
    private DispatchUserPrincipal destDispatcher;
    private DispatchUserPrincipal originCourier1Principal;
    private DispatchUserPrincipal originCourier2Principal;
    private DispatchUserPrincipal destCourierPrincipal;

    @BeforeEach
    void setUp() {
        rabbitTemplate = mock(RabbitTemplate.class);
        applicationEventPublisher = mock(ApplicationEventPublisher.class);
        orderServiceClient = mock(OrderServiceClient.class);

        eventPublisher = new DispatchEventPublisher(
                rabbitTemplate,
                "swiftdrop.events",
                outboxRepository,
                applicationEventPublisher,
                new ObjectMapper()
        );

        PodEvidenceStorageService podStorageService = new PodEvidenceStorageService(tempEvidenceDir.toString());
        dispatchService = new DispatchService(
                courierRepository,
                pickupTaskRepository,
                deliveryJobRepository,
                assignmentRepository,
                attemptRepository,
                podRepository,
                exceptionRepository,
                orderServiceClient,
                podStorageService,
                eventPublisher
        );

        DispatchSupportService supportService = new DispatchSupportService(
                courierRepository,
                assignmentRepository,
                deliveryJobRepository,
                pickupTaskRepository,
                orderServiceClient,
                eventPublisher
        );
        custodyTrackingService = new CustodyTrackingService(
                custodyRepository,
                manifestRepository,
                returnTaskRepository,
                supportService
        );
        returnTaskService = new ReturnTaskService(
                returnTaskRepository,
                deliveryJobRepository,
                pickupTaskRepository,
                exceptionRepository,
                assignmentRepository,
                courierRepository,
                podStorageService,
                custodyTrackingService,
                supportService
        );
        operationalExceptionService = new OperationalExceptionService(
                exceptionRepository,
                deliveryJobRepository,
                pickupTaskRepository,
                manifestRepository,
                manifestParcelRepository,
                returnTaskRepository,
                podStorageService,
                custodyTrackingService,
                returnTaskService,
                supportService
        );
        transferManifestService = new TransferManifestService(
                manifestRepository,
                manifestParcelRepository,
                pickupTaskRepository,
                deliveryJobRepository,
                returnTaskRepository,
                assignmentRepository,
                courierRepository,
                custodyTrackingService,
                operationalExceptionService,
                supportService
        );
        orderEventListener = new OrderEventListener(dispatchService, processedEventRepository);

        originDispatcher = new DispatchUserPrincipal("disp-cmb-1", "cmb.disp@swiftdrop.lk", List.of("DISPATCHER"), 1L);
        destDispatcher = new DispatchUserPrincipal("disp-kdy-1", "kdy.disp@swiftdrop.lk", List.of("DISPATCHER"), 2L);
        originCourier1Principal = new DispatchUserPrincipal("usr-cr-cmb-1", "kamal@swiftdrop.lk", List.of("COURIER"), 1L);
        originCourier2Principal = new DispatchUserPrincipal("usr-cr-cmb-2", "nimal@swiftdrop.lk", List.of("COURIER"), 1L);
        destCourierPrincipal = new DispatchUserPrincipal("usr-cr-kdy-1", "saman@swiftdrop.lk", List.of("COURIER"), 2L);

        seedCourier("CR-CMB-1", "usr-cr-cmb-1", "Kamal Silva", "kamal@swiftdrop.lk", 1L, "CMB", "Colombo Central", VehicleType.VAN);
        seedCourier("CR-CMB-2", "usr-cr-cmb-2", "Nimal Bandara", "nimal@swiftdrop.lk", 1L, "CMB", "Colombo Central", VehicleType.VAN);
        seedCourier("CR-KDY-1", "usr-cr-kdy-1", "Saman Perera", "saman@swiftdrop.lk", 2L, "KDY", "Kandy Hub", VehicleType.MOTORCYCLE);
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void fullInterBranchHappyPathWithReassignmentAndOutboxEvents() {
        MDC.put(CorrelationIdHolder.MDC_KEY, "corr-e2e-happy");
        mockOrderSummary("8001", "SD-80001");

        // 1. OrderConfirmed event arrives -> creates PickupTask & emits PickupTaskCreated
        Map<String, Object> confirmedEvent = Map.ofEntries(
                Map.entry("eventId", "evt-ord-8001"),
                Map.entry("eventType", "OrderConfirmed"),
                Map.entry("correlationId", "corr-e2e-happy"),
                Map.entry("orderId", "8001"),
                Map.entry("trackingNumber", "SD-80001"),
                Map.entry("pickupMethod", "COURIER_PICKUP"),
                Map.entry("originBranchId", 1L),
                Map.entry("originBranchCode", "CMB"),
                Map.entry("originBranchName", "Colombo Central"),
                Map.entry("destinationBranchId", 2L),
                Map.entry("destinationBranchCode", "KDY"),
                Map.entry("destinationBranchName", "Kandy Hub"),
                Map.entry("sameBranch", false),
                Map.entry("pickupAddress", "120 Galle Rd, Colombo"),
                Map.entry("senderName", "Kasun"),
                Map.entry("senderPhone", "+94771112222"),
                Map.entry("dropoffAddress", "45 Peradeniya Rd, Kandy"),
                Map.entry("recipientName", "Amaya"),
                Map.entry("recipientPhone", "+94773334444"),
                Map.entry("weightKg", 2.50),
                Map.entry("deliveryFee", 1450.00)
        );
        orderEventListener.handleDomainEvent(confirmedEvent);
        // Duplicate event must be deduplicated cleanly via processed_domain_events
        orderEventListener.handleDomainEvent(confirmedEvent);

        PickupTask pickupTask = pickupTaskRepository.findByOrderId("8001").orElseThrow();
        assertThat(pickupTask.getStatus()).isEqualTo(PickupTaskStatus.PENDING_ASSIGNMENT);
        assertThat(outboxRepository.findAll()).extracting(DispatchOutboxEvent::getEventType)
                .containsExactly("PickupTaskCreated");

        // 2. Origin dispatcher assigns pickup courier CR-CMB-1 -> reassigns to CR-CMB-2 (Exception #4)
        AssignCourierRequest assignPickupReq = new AssignCourierRequest();
        assignPickupReq.setOrderId("8001");
        assignPickupReq.setPickupTaskId(pickupTask.getId());
        assignPickupReq.setTaskType("PICKUP");
        assignPickupReq.setCourierId("CR-CMB-1");
        AssignmentRecordDto pickupAsn = dispatchService.assignCourier(assignPickupReq, originDispatcher);

        ReassignCourierRequest reassignReq = new ReassignCourierRequest();
        reassignReq.setAssignmentId(pickupAsn.getAssignmentCode());
        reassignReq.setOrderId("8001");
        reassignReq.setCurrentCourierId("CR-CMB-1");
        reassignReq.setNewCourierId("CR-CMB-2");
        reassignReq.setReason("Vehicle inspection delay");
        AssignmentRecordDto reassignedPickup = dispatchService.reassignCourier(
                pickupAsn.getAssignmentCode(), reassignReq, originDispatcher);
        assertThat(reassignedPickup.getCourier().getCode()).isEqualTo("CR-CMB-2");

        // 3. Reassigned courier accepts and picks up parcel
        dispatchService.acceptAssignment(reassignedPickup.getAssignmentCode(), originCourier2Principal);
        dispatchService.markPickedUp(reassignedPickup.getAssignmentCode(), originCourier2Principal);

        // 4. Transfer manifest Colombo -> Kandy created, assigned to regular courier CR-CMB-1, departed, received at Kandy
        CreateTransferManifestRequest manifestReq = new CreateTransferManifestRequest();
        manifestReq.setOriginBranchId(1L);
        manifestReq.setOriginBranchCode("CMB");
        manifestReq.setOriginBranchName("Colombo Central");
        manifestReq.setDestinationBranchId(2L);
        manifestReq.setDestinationBranchCode("KDY");
        manifestReq.setDestinationBranchName("Kandy Hub");
        manifestReq.setOrderIds(List.of("8001"));
        TransferManifestDto manifest = transferManifestService.createManifest(manifestReq, originDispatcher);

        transferManifestService.assignCourier(manifest.getManifestCode(),
                new AssignTransferCourierRequest("CR-CMB-1", "Linehaul dispatch"), originDispatcher);
        transferManifestService.departManifest(manifest.getManifestCode(), new DepartManifestRequest(), originDispatcher);

        ReceiveManifestRequest receiveReq = new ReceiveManifestRequest();
        receiveReq.setReceivedOrderIds(List.of("8001"));
        TransferManifestDto received = transferManifestService.receiveManifest(manifest.getManifestCode(), receiveReq, destDispatcher);
        assertThat(received.getStatus()).isEqualTo("COMPLETED");

        // 5. Destination dispatcher assigns delivery courier -> courier accepts -> goes OutForDelivery -> completes with POD
        DeliveryJob destJob = deliveryJobRepository.findByOrderId("8001").orElseThrow();
        assertThat(destJob.getBranchId()).isEqualTo(2L);
        assertThat(destJob.getStatus()).isEqualTo(DeliveryJobStatus.UNASSIGNED);

        AssignCourierRequest assignDeliveryReq = new AssignCourierRequest();
        assignDeliveryReq.setOrderId("8001");
        assignDeliveryReq.setDeliveryJobId(destJob.getId());
        assignDeliveryReq.setTaskType("DELIVERY");
        assignDeliveryReq.setCourierId("CR-KDY-1");
        AssignmentRecordDto deliveryAsn = dispatchService.assignCourier(assignDeliveryReq, destDispatcher);

        dispatchService.acceptAssignment(deliveryAsn.getAssignmentCode(), destCourierPrincipal);
        dispatchService.markPickedUp(deliveryAsn.getAssignmentCode(), destCourierPrincipal);

        ProofOfDeliveryRequest podReq = new ProofOfDeliveryRequest();
        podReq.setRecipientName("Amaya Fernando");
        podReq.setProofType("SIGNATURE");
        podReq.setSignatureReference("sig-80001");
        podReq.setParcelReference("PRC-SD-80001");
        DeliveryJobDto completed = dispatchService.completeDelivery(deliveryAsn.getAssignmentCode(), podReq, destCourierPrincipal);

        assertThat(completed.getStatus()).isEqualTo("DELIVERED");
        assertThat(completed.getProofOfDelivery()).isNotNull();

        List<String> publishedTypes = outboxRepository.findAll().stream()
                .map(DispatchOutboxEvent::getEventType)
                .toList();
        assertThat(publishedTypes).containsExactly(
                "PickupTaskCreated",
                "CourierAssigned",
                "CourierAssigned",
                "ParcelPickedUp",
                "ParcelReceivedAtBranch",
                "TRANSFER_MANIFEST_CREATED",
                "TRANSFER_MANIFEST_ASSIGNED",
                "PARCEL_CUSTODY_RECORDED",
                "TransferManifestDispatched",
                "PARCEL_CUSTODY_RECORDED",
                "ParcelReceivedAtDestinationBranch",
                "TRANSFER_MANIFEST_RECEIVED",
                "TRANSFER_MANIFEST_COMPLETED",
                "CourierAssigned",
                "OutForDelivery",
                "DeliveryCompleted"
        );

        outboxRepository.findAll().forEach(eventPublisher::attemptPublish);
        verify(rabbitTemplate, times(16)).convertAndSend(
                eq("swiftdrop.events"), anyString(), any(Map.class), any(MessagePostProcessor.class));
    }

    @Test
    void failedDeliveryEscalationReturnToSenderAndManifestDiscrepancyExceptions() {
        mockOrderSummary("8002", "SD-80002", 1L, "CMB", "Colombo Central", true);
        mockOrderSummary("8003", "SD-80003");

        // Scenario A: 3 failed attempts -> PENDING_DISPATCHER_DECISION -> RETURN_TO_SENDER -> ReturnTask lifecycle
        BranchDropoffConfirmRequest dropoffReq = new BranchDropoffConfirmRequest();
        dropoffReq.setOrderId("8002");
        dropoffReq.setTrackingNumber("SD-80002");
        dropoffReq.setBranchId(1L);
        dropoffReq.setBranchCode("CMB");
        dropoffReq.setBranchName("Colombo Central");
        dropoffReq.setEmployeeId("EMP-1");
        dropoffReq.setEmployeeName("Front Desk");
        dropoffReq.setParcelReference("PRC-80002");
        PickupTaskDto dropoff = dispatchService.confirmBranchDropoff(dropoffReq, originDispatcher);
        assertThat(dropoff.getStatus()).isEqualTo("BRANCH_RECEIVED");

        DeliveryJob job = deliveryJobRepository.findByOrderId("8002").orElseThrow();
        AssignCourierRequest assignReq = new AssignCourierRequest();
        assignReq.setOrderId("8002");
        assignReq.setDeliveryJobId(job.getId());
        assignReq.setTaskType("DELIVERY");
        assignReq.setCourierId("CR-CMB-1");
        AssignmentRecordDto asn = dispatchService.assignCourier(assignReq, originDispatcher);
        dispatchService.acceptAssignment(asn.getAssignmentCode(), originCourier1Principal);
        dispatchService.markPickedUp(asn.getAssignmentCode(), originCourier1Principal);

        dispatchService.recordFailedDelivery(asn.getAssignmentCode(), new FailedDeliveryRequest("No answer", "Call 1"), originCourier1Principal);
        dispatchService.recordFailedDelivery(asn.getAssignmentCode(), new FailedDeliveryRequest("Gate locked", "Call 2"), originCourier1Principal);
        DeliveryJobDto after3 = dispatchService.recordFailedDelivery(asn.getAssignmentCode(), new FailedDeliveryRequest("Refused", "Call 3"), originCourier1Principal);
        assertThat(after3.getStatus()).isEqualTo("FAILED");
        assertThat(after3.getAttemptCount()).isEqualTo(3);
        assertThat(deliveryJobRepository.findByOrderId("8002").orElseThrow().getStatus())
                .isEqualTo(DeliveryJobStatus.PENDING_DISPATCHER_DECISION);

        // 4th attempt is blocked
        assertThatThrownBy(() -> dispatchService.recordFailedDelivery(
                asn.getAssignmentCode(), new FailedDeliveryRequest("No answer", "Call 4"), originCourier1Principal))
                .isInstanceOf(DispatchValidationException.class);

        DeliveryException escalated = exceptionRepository.findByDeliveryJobIdAndStatus(job.getId(), ExceptionStatus.PENDING_DECISION).orElseThrow();
        DeliveryExceptionDto resolvedRts = dispatchService.resolveException(
                escalated.getExceptionCode(),
                new ExceptionDecisionRequest("RETURN_TO_SENDER", "Return parcel after 3 failed attempts"),
                originDispatcher);
        assertThat(resolvedRts.getStatus()).isEqualTo("RESOLVED");

        ReturnTaskDto rts = returnTaskService.createReturnTask(
                buildReturnTaskRequest(job.getId(), escalated.getId(), "8002", "SD-80002"), originDispatcher);
        ConfirmReturnToSenderRequest confirmRts = new ConfirmReturnToSenderRequest();
        confirmRts.setSenderConfirmedBy("Sender Desk");
        ReturnTaskDto returned = returnTaskService.confirmReturnToSender(rts.getReturnCode(), confirmRts, originDispatcher);
        assertThat(returned.getStatus()).isEqualTo("RETURNED_TO_SENDER");

        // Scenario B: Transfer manifest missing parcel creates discrepancy exception (Exception #5)
        PickupTask missingParcel = new PickupTask();
        missingParcel.setTaskCode("PKP-8003");
        missingParcel.setOrderId("8003");
        missingParcel.setTrackingNumber("SD-80003");
        missingParcel.setPickupMethod(PickupMethod.COURIER_PICKUP);
        missingParcel.setOriginBranchId(1L);
        missingParcel.setOriginBranchCode("CMB");
        missingParcel.setOriginBranchName("Colombo Central");
        missingParcel.setDestinationBranchId(2L);
        missingParcel.setDestinationBranchCode("KDY");
        missingParcel.setDestinationBranchName("Kandy Hub");
        missingParcel.setSameBranch(false);
        missingParcel.setSenderName("Kasun");
        missingParcel.setSenderPhone("+94771112222");
        missingParcel.setPickupAddress("10 Galle Rd");
        missingParcel.setRecipientName("Amaya");
        missingParcel.setRecipientPhone("+94773334444");
        missingParcel.setDropoffAddress("25 Peradeniya Rd");
        missingParcel.setParcelCategory("General");
        missingParcel.setWeightKg(new BigDecimal("2.00"));
        missingParcel.setStatus(PickupTaskStatus.PICKED_UP);
        pickupTaskRepository.save(missingParcel);

        CreateTransferManifestRequest mReq = new CreateTransferManifestRequest();
        mReq.setOriginBranchId(1L);
        mReq.setDestinationBranchId(2L);
        mReq.setOrderIds(List.of("8003"));
        TransferManifestDto manifest = transferManifestService.createManifest(mReq, originDispatcher);
        transferManifestService.assignCourier(manifest.getManifestCode(),
                new AssignTransferCourierRequest("CR-CMB-2", "Linehaul"), originDispatcher);
        transferManifestService.departManifest(manifest.getManifestCode(), new DepartManifestRequest(), originDispatcher);

        ReceiveManifestRequest recReq = new ReceiveManifestRequest();
        recReq.setMissingOrderIds(List.of("8003"));
        recReq.setDiscrepancyNotes("Bag arrived minus SD-80003");
        TransferManifestDto discrepant = transferManifestService.receiveManifest(manifest.getManifestCode(), recReq, destDispatcher);
        assertThat(discrepant.getStatus()).isEqualTo("RECEIVED_WITH_DISCREPANCY");
        assertThat(discrepant.getMissingParcelCount()).isEqualTo(1);

        assertThat(outboxRepository.findAll()).extracting(DispatchOutboxEvent::getEventType)
                .contains("ParcelReceivedAtBranch", "DeliveryAttemptFailed", "ReturnToSenderInitiated", "ReturnedToSender");
    }

    @Test
    void crossServiceJwtValidationSupportsAlignedAndEnvExampleSecrets() throws Exception {
        String rawSecretSample = "test-non-base64-raw-secret-key-for-hmac-derivation-check";
        DispatchJwtService jwtService = new DispatchJwtService(rawSecretSample);
        byte[] keyBytes;
        try {
            byte[] decoded = Decoders.BASE64.decode(rawSecretSample);
            keyBytes = decoded.length >= 32 ? decoded
                    : MessageDigest.getInstance("SHA-256").digest(rawSecretSample.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            keyBytes = MessageDigest.getInstance("SHA-256").digest(rawSecretSample.getBytes(StandardCharsets.UTF_8));
        }
        SecretKey key = Keys.hmacShaKeyFor(keyBytes);

        String token = Jwts.builder()
                .issuer(DispatchJwtService.EXPECTED_ISSUER)
                .subject("disp-kdy-1")
                .claim("email", "kdy.disp@swiftdrop.lk")
                .claim("roles", List.of("DISPATCHER"))
                .claim("branchId", 2L)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 600_000L))
                .signWith(key)
                .compact();

        DispatchUserPrincipal principal = jwtService.extractPrincipal(token, 999L);
        assertThat(principal.userId()).isEqualTo("disp-kdy-1");
        assertThat(principal.branchId()).isEqualTo(2L);
        assertThat(principal.hasRole("DISPATCHER")).isTrue();
    }

    private void seedCourier(
            String code,
            String userId,
            String name,
            String email,
            Long branchId,
            String branchCode,
            String branchName,
            VehicleType vehicleType) {
        CourierProfileEntity courier = new CourierProfileEntity();
        courier.setCourierCode(code);
        courier.setUserId(userId);
        courier.setName(name);
        courier.setPhone("+94771000000");
        courier.setEmail(email);
        courier.setVehicleType(vehicleType);
        courier.setVehiclePlate("WP-" + code);
        courier.setBranchId(branchId);
        courier.setBranchCode(branchCode);
        courier.setBranchName(branchName);
        courier.setZone("Zone A");
        courier.setAvailabilityStatus(CourierAvailabilityStatus.AVAILABLE);
        courier.setMaxCapacity(8);
        courierRepository.save(courier);
    }

    private void mockOrderSummary(String orderId, String trackingNumber) {
        mockOrderSummary(orderId, trackingNumber, 2L, "KDY", "Kandy Hub", false);
    }

    private void mockOrderSummary(
            String orderId,
            String trackingNumber,
            Long destBranchId,
            String destBranchCode,
            String destBranchName,
            boolean sameBranch) {
        OrderSummaryDto summary = new OrderSummaryDto();
        summary.setOrderId(orderId);
        summary.setTrackingNumber(trackingNumber);
        summary.setStatus("CONFIRMED");
        summary.setPickupMethod("COURIER_PICKUP");
        summary.setOriginBranchId(1L);
        summary.setOriginBranchCode("CMB");
        summary.setOriginBranchName("Colombo Central");
        summary.setDestinationBranchId(destBranchId);
        summary.setDestinationBranchCode(destBranchCode);
        summary.setDestinationBranchName(destBranchName);
        summary.setSameBranch(sameBranch);
        summary.setPickupAddress("120 Galle Rd, Colombo");
        summary.setPickupContactName("Kasun");
        summary.setPickupContactPhone("+94771112222");
        summary.setDropoffAddress("45 Peradeniya Rd, Kandy");
        summary.setDropoffContactName("Amaya");
        summary.setDropoffContactPhone("+94773334444");
        summary.setWeightKg(new BigDecimal("2.50"));
        summary.setDeliveryFee(new BigDecimal("1450.00"));
        when(orderServiceClient.getOrderByIdOrTracking(eq(orderId))).thenReturn(summary);
        when(orderServiceClient.getOrderByIdOrTracking(eq(trackingNumber))).thenReturn(summary);
    }

    private CreateReturnTaskRequest buildReturnTaskRequest(
            Long deliveryJobId, Long exceptionId, String orderId, String trackingNumber) {
        CreateReturnTaskRequest req = new CreateReturnTaskRequest();
        req.setDeliveryJobId(deliveryJobId);
        req.setExceptionId(exceptionId);
        req.setOrderId(orderId);
        req.setTrackingNumber(trackingNumber);
        req.setReason("Three delivery attempts exhausted");
        return req;
    }
}

