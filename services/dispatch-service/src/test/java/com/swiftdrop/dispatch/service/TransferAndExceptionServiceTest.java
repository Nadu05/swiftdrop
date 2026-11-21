package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.client.OrderStatusTransitionPayload;
import com.swiftdrop.dispatch.client.OrderSummaryDto;
import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.repository.*;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferAndExceptionServiceTest {

    @TempDir
    Path tempEvidenceDir;

    @Mock private TransferManifestRepository manifestRepository;
    @Mock private TransferManifestParcelRepository manifestParcelRepository;
    @Mock private PickupTaskRepository pickupTaskRepository;
    @Mock private DeliveryJobRepository deliveryJobRepository;
    @Mock private ReturnTaskRepository returnTaskRepository;
    @Mock private ParcelCustodyRecordRepository custodyRepository;
    @Mock private DeliveryExceptionRepository exceptionRepository;
    @Mock private CourierAssignmentRepository assignmentRepository;
    @Mock private CourierProfileRepository courierRepository;
    @Mock private OrderServiceClient orderServiceClient;
    @Mock private DispatchEventPublisher eventPublisher;

    private DispatchSupportService supportService;
    private CustodyTrackingService custodyTrackingService;
    private ReturnTaskService returnTaskService;
    private OperationalExceptionService operationalExceptionService;
    private TransferManifestService transferManifestService;
    private PodEvidenceStorageService evidenceStorageService;

    private final AtomicLong seq = new AtomicLong(100);
    private final Map<Long, TransferManifest> manifestStore = new LinkedHashMap<>();
    private final Map<Long, ReturnTask> returnStore = new LinkedHashMap<>();
    private final Map<Long, DeliveryException> exceptionStore = new LinkedHashMap<>();
    private final List<ParcelCustodyRecord> custodyStore = new ArrayList<>();
    private final List<DeliveryJob> jobStore = new ArrayList<>();
    private final List<CourierAssignment> assignmentStore = new ArrayList<>();

    private DispatchUserPrincipal originDispatcher;
    private DispatchUserPrincipal destDispatcher;
    private DispatchUserPrincipal adminUser;
    private DispatchUserPrincipal assignedCourierPrincipal;
    private DispatchUserPrincipal otherCourierPrincipal;
    private DispatchUserPrincipal customerUser;

    private CourierProfileEntity originVanCourier;
    private CourierProfileEntity originBicycleCourier;
    private CourierProfileEntity destBranchCourier;
    private CourierProfileEntity offlineCourier;

    private PickupTask parcel1;
    private PickupTask parcel2;
    private PickupTask sameBranchParcel;
    private PickupTask uncollectedParcel;

    @BeforeEach
    void setUp() {
        evidenceStorageService = new PodEvidenceStorageService(tempEvidenceDir.toString());
        supportService = new DispatchSupportService(
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
                evidenceStorageService,
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
                evidenceStorageService,
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

        originDispatcher = new DispatchUserPrincipal("disp-cmb", "cmb.disp@swiftdrop.lk", List.of("DISPATCHER"), 1L);
        destDispatcher = new DispatchUserPrincipal("disp-kdy", "kdy.disp@swiftdrop.lk", List.of("DISPATCHER"), 2L);
        adminUser = new DispatchUserPrincipal("admin-1", "admin@swiftdrop.lk", List.of("ADMIN"), null);
        assignedCourierPrincipal = new DispatchUserPrincipal("user-c1", "van.courier@swiftdrop.lk", List.of("COURIER"), 1L);
        otherCourierPrincipal = new DispatchUserPrincipal("user-c99", "other.courier@swiftdrop.lk", List.of("COURIER"), 2L);
        customerUser = new DispatchUserPrincipal("cust-1", "cust@swiftdrop.lk", List.of("CUSTOMER"), null);

        originVanCourier = courier(11L, "CR-VAN-1", "user-c1", "van.courier@swiftdrop.lk", "Kamal Silva",
                1L, "CMB", "Colombo Hub", VehicleType.VAN, CourierAvailabilityStatus.AVAILABLE, 8);
        originBicycleCourier = courier(12L, "CR-BIC-1", "user-c2", "bike@swiftdrop.lk", "Nimal Bike",
                1L, "CMB", "Colombo Hub", VehicleType.BICYCLE, CourierAvailabilityStatus.AVAILABLE, 8);
        destBranchCourier = courier(21L, "CR-KDY-1", "user-c99", "other.courier@swiftdrop.lk", "Saman Kandy",
                2L, "KDY", "Kandy Hub", VehicleType.VAN, CourierAvailabilityStatus.AVAILABLE, 8);
        offlineCourier = courier(13L, "CR-OFF-1", "user-c3", "off@swiftdrop.lk", "Offline Rider",
                1L, "CMB", "Colombo Hub", VehicleType.VAN, CourierAvailabilityStatus.OFFLINE, 8);

        parcel1 = pickupTask(101L, "PKP-101", "ORD-101", "SD-101", 1L, "CMB", "Colombo Hub",
                2L, "KDY", "Kandy Hub", false, PickupTaskStatus.PICKED_UP, new BigDecimal("8.50"));
        parcel2 = pickupTask(102L, "PKP-102", "ORD-102", "SD-102", 1L, "CMB", "Colombo Hub",
                2L, "KDY", "Kandy Hub", false, PickupTaskStatus.BRANCH_RECEIVED, new BigDecimal("4.00"));
        sameBranchParcel = pickupTask(103L, "PKP-103", "ORD-103", "SD-103", 1L, "CMB", "Colombo Hub",
                1L, "CMB", "Colombo Hub", true, PickupTaskStatus.PICKED_UP, new BigDecimal("2.00"));
        uncollectedParcel = pickupTask(104L, "PKP-104", "ORD-104", "SD-104", 1L, "CMB", "Colombo Hub",
                2L, "KDY", "Kandy Hub", false, PickupTaskStatus.PENDING_ASSIGNMENT, new BigDecimal("3.00"));

        wireRepositoryDefaults();
    }

    @Test
    void readyParcelsExcludeSameBranchUncollectedAndConflictingActiveManifests() {
        when(pickupTaskRepository.findByOriginBranchIdAndSameBranchFalseOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(parcel1, parcel2, uncollectedParcel));
        when(manifestParcelRepository.findBlockedOrderIds(anyCollection(), anyCollection()))
                .thenReturn(List.of("ORD-102"));

        List<ReadyForTransferParcelDto> ready = transferManifestService
                .listReadyForTransferParcels(1L, 2L, originDispatcher);

        assertThat(ready).hasSize(1);
        assertThat(ready.get(0).getOrderId()).isEqualTo("ORD-101");
        assertThat(ready.get(0).getTrackingNumber()).isEqualTo("SD-101");
    }

    @Test
    void fullHappyPathInterBranchTransferManifestLifecycle() {
        CreateTransferManifestRequest createReq = new CreateTransferManifestRequest();
        createReq.setOriginBranchId(1L);
        createReq.setOriginBranchCode("CMB");
        createReq.setOriginBranchName("Colombo Hub");
        createReq.setDestinationBranchId(2L);
        createReq.setDestinationBranchCode("KDY");
        createReq.setDestinationBranchName("Kandy Hub");
        createReq.setOrderIds(List.of("ORD-101", "ORD-102"));

        TransferManifestDto created = transferManifestService.createManifest(createReq, originDispatcher);
        assertThat(created.getManifestCode()).startsWith("TRF-");
        assertThat(created.getStatus()).isEqualTo("DRAFT");
        assertThat(created.getExpectedParcelCount()).isEqualTo(2);

        AssignTransferCourierRequest assignReq = new AssignTransferCourierRequest("CR-VAN-1", "Afternoon linehaul run");
        TransferManifestDto assigned = transferManifestService.assignCourier(created.getManifestCode(), assignReq, originDispatcher);
        assertThat(assigned.getStatus()).isEqualTo("ASSIGNED");
        assertThat(assigned.getAssignedCourierCode()).isEqualTo("CR-VAN-1");
        assertThat(assignmentStore).hasSize(1);
        assertThat(assignmentStore.get(0).getTaskType()).isEqualTo(AssignmentTaskType.TRANSFER);

        DepartManifestRequest departReq = new DepartManifestRequest();
        departReq.setSealNumber("SEAL-8891");
        departReq.setHandoverNotes("Sealed and verified at bay 4");
        TransferManifestDto departed = transferManifestService.departManifest(created.getManifestCode(), departReq, originDispatcher);
        assertThat(departed.getStatus()).isEqualTo("IN_TRANSIT");
        assertThat(departed.getDepartureAt()).isNotBlank();
        assertThat(departed.getOriginHandoverAt()).isNotBlank();
        assertThat(departed.getParcels()).allMatch(p -> "DISPATCHED".equals(p.getStatus()));
        assertThat(custodyStore).hasSize(2);
        assertThat(custodyStore).allMatch(c -> c.getEventType() == CustodyEventType.MANIFEST_HANDOVER_DEPARTURE);
        verify(orderServiceClient, times(2))
                .notifyStatusTransition(anyString(), argThat(p -> "IN_TRANSIT".equals(p.getStatus())), anyString(), anyString());

        ReceiveManifestRequest receiveReq = new ReceiveManifestRequest();
        receiveReq.setReceivedOrderIds(List.of("ORD-101", "ORD-102"));
        receiveReq.setNotes("All seals intact");
        TransferManifestDto received = transferManifestService.receiveManifest(created.getManifestCode(), receiveReq, destDispatcher);

        assertThat(received.getStatus()).isEqualTo("COMPLETED");
        assertThat(received.getExpectedParcelCount()).isEqualTo(2);
        assertThat(received.getReceivedParcelCount()).isEqualTo(2);
        assertThat(received.getMissingParcelCount()).isZero();
        assertThat(received.getDamagedParcelCount()).isZero();
        assertThat(received.getDestinationReceivedAt()).isNotBlank();
        assertThat(received.getCompletedAt()).isNotBlank();
        assertThat(jobStore).hasSize(2);
        assertThat(jobStore).allMatch(j -> Objects.equals(j.getBranchId(), 2L) && j.getStatus() == DeliveryJobStatus.UNASSIGNED);
        verify(orderServiceClient, times(2))
                .notifyStatusTransition(anyString(), argThat(p -> "AT_DESTINATION_BRANCH".equals(p.getStatus()) && "Kandy Hub".equals(p.getLocation())), eq("disp-kdy"), eq("DISPATCHER"));
        assertThat(custodyStore).hasSize(4);
    }

    @Test
    void blocksConflictingActiveManifestAndAllowsAfterCancel() {
        CreateTransferManifestRequest req = new CreateTransferManifestRequest();
        req.setOriginBranchId(1L);
        req.setDestinationBranchId(2L);
        req.setOrderIds(List.of("ORD-101"));

        TransferManifestDto first = transferManifestService.createManifest(req, originDispatcher);

        when(manifestParcelRepository.existsConflictingActiveParcel(eq("ORD-101"), eq("SD-101"), anyCollection(), anyCollection()))
                .thenReturn(true);

        CreateTransferManifestRequest conflictingReq = new CreateTransferManifestRequest();
        conflictingReq.setOriginBranchId(1L);
        conflictingReq.setDestinationBranchId(2L);
        conflictingReq.setOrderIds(List.of("ORD-101"));

        assertThatThrownBy(() -> transferManifestService.createManifest(conflictingReq, originDispatcher))
                .isInstanceOf(DispatchValidationException.class)
                .hasMessageContaining("already assigned to another active transfer manifest");

        transferManifestService.cancelManifest(first.getManifestCode(), "Consolidating with later vehicle", originDispatcher);
        when(manifestParcelRepository.existsConflictingActiveParcel(eq("ORD-101"), eq("SD-101"), anyCollection(), anyCollection()))
                .thenReturn(false);

        TransferManifestDto replacement = transferManifestService.createManifest(conflictingReq, originDispatcher);
        assertThat(replacement.getExpectedParcelCount()).isEqualTo(1);
    }

    @Test
    void enforcesManifestEligibilityAndCourierValidationRules() {
        CreateTransferManifestRequest sameBranchReq = new CreateTransferManifestRequest();
        sameBranchReq.setOriginBranchId(1L);
        sameBranchReq.setDestinationBranchId(1L);
        assertThatThrownBy(() -> transferManifestService.createManifest(sameBranchReq, originDispatcher))
                .isInstanceOf(DispatchValidationException.class)
                .hasMessageContaining("cannot be the same");

        CreateTransferManifestRequest validReq = new CreateTransferManifestRequest();
        validReq.setOriginBranchId(1L);
        validReq.setDestinationBranchId(2L);
        TransferManifestDto manifest = transferManifestService.createManifest(validReq, originDispatcher);

        AddManifestParcelsRequest addSameBranch = new AddManifestParcelsRequest();
        addSameBranch.setOrderIds(List.of("ORD-103"));
        assertThatThrownBy(() -> transferManifestService.addParcels(manifest.getManifestCode(), addSameBranch, originDispatcher))
                .isInstanceOf(DispatchValidationException.class)
                .hasMessageContaining("same-branch");

        AddManifestParcelsRequest addPending = new AddManifestParcelsRequest();
        addPending.setOrderIds(List.of("ORD-104"));
        assertThatThrownBy(() -> transferManifestService.addParcels(manifest.getManifestCode(), addPending, originDispatcher))
                .isInstanceOf(DispatchValidationException.class)
                .hasMessageContaining("not ready");

        assertThatThrownBy(() -> transferManifestService.departManifest(manifest.getManifestCode(), null, originDispatcher))
                .isInstanceOf(DispatchValidationException.class)
                .hasMessageContaining("Assign a regular courier");

        AddManifestParcelsRequest addHeavy = new AddManifestParcelsRequest();
        addHeavy.setOrderIds(List.of("ORD-101")); // 8.50kg > BICYCLE 5kg limit
        transferManifestService.addParcels(manifest.getManifestCode(), addHeavy, originDispatcher);

        assertThatThrownBy(() -> transferManifestService.assignCourier(
                manifest.getManifestCode(), new AssignTransferCourierRequest("CR-BIC-1", null), originDispatcher))
                .isInstanceOf(DispatchValidationException.class)
                .hasMessageContaining("vehicle capacity");

        assertThatThrownBy(() -> transferManifestService.assignCourier(
                manifest.getManifestCode(), new AssignTransferCourierRequest("CR-KDY-1", null), originDispatcher))
                .isInstanceOf(DispatchValidationException.class)
                .hasMessageContaining("belongs to branch");

        assertThatThrownBy(() -> transferManifestService.assignCourier(
                manifest.getManifestCode(), new AssignTransferCourierRequest("CR-OFF-1", null), originDispatcher))
                .isInstanceOf(DispatchValidationException.class)
                .hasMessageContaining("OFFLINE");
    }

    @Test
    void destinationReceiptDetectsMissingAndDamagedParcelsCreatesExceptionsAndSupportsResume() {
        CreateTransferManifestRequest createReq = new CreateTransferManifestRequest();
        createReq.setOriginBranchId(1L);
        createReq.setOriginBranchCode("CMB");
        createReq.setOriginBranchName("Colombo Hub");
        createReq.setDestinationBranchId(2L);
        createReq.setDestinationBranchCode("KDY");
        createReq.setDestinationBranchName("Kandy Hub");
        createReq.setOrderIds(List.of("ORD-101", "ORD-102"));
        TransferManifestDto created = transferManifestService.createManifest(createReq, originDispatcher);

        // Add third parcel on same route
        PickupTask parcel3 = pickupTask(105L, "PKP-105", "ORD-105", "SD-105", 1L, "CMB", "Colombo Hub",
                2L, "KDY", "Kandy Hub", false, PickupTaskStatus.PICKED_UP, new BigDecimal("2.00"));
        when(pickupTaskRepository.findByOrderId("ORD-105")).thenReturn(Optional.of(parcel3));
        AddManifestParcelsRequest addThird = new AddManifestParcelsRequest();
        addThird.setOrderIds(List.of("ORD-105"));
        transferManifestService.addParcels(created.getManifestCode(), addThird, originDispatcher);

        transferManifestService.assignCourier(created.getManifestCode(),
                new AssignTransferCourierRequest("CR-VAN-1", "Linehaul"), originDispatcher);
        transferManifestService.departManifest(created.getManifestCode(), new DepartManifestRequest(), originDispatcher);

        ReceiveManifestRequest receiveReq = new ReceiveManifestRequest();
        receiveReq.setReceivedOrderIds(List.of("ORD-101"));
        receiveReq.setMissingOrderIds(List.of("ORD-102"));
        ReceiveManifestRequest.ParcelConditionItem damaged = new ReceiveManifestRequest.ParcelConditionItem();
        damaged.setParcelKey("ORD-105");
        damaged.setDiscrepancyNotes("Crushed carton corner upon unloading");
        damaged.setEvidenceReference("https://cdn.swiftdrop.lk/evidence/damaged-105.jpg");
        receiveReq.setDamagedParcels(List.of(damaged));
        receiveReq.setDiscrepancyNotes("Unloading discrepancy at Kandy Hub");

        TransferManifestDto receipt = transferManifestService.receiveManifest(created.getManifestCode(), receiveReq, destDispatcher);

        assertThat(receipt.getStatus()).isEqualTo("RECEIVED_WITH_DISCREPANCY");
        assertThat(receipt.getExpectedParcelCount()).isEqualTo(3);
        assertThat(receipt.getReceivedParcelCount()).isEqualTo(1);
        assertThat(receipt.getMissingParcelCount()).isEqualTo(1);
        assertThat(receipt.getDamagedParcelCount()).isEqualTo(1);
        assertThat(jobStore).hasSize(1);
        assertThat(jobStore.get(0).getOrderId()).isEqualTo("ORD-101");

        assertThat(exceptionStore).hasSize(2);
        List<DeliveryException> createdExceptions = new ArrayList<>(exceptionStore.values());
        DeliveryException missingEx = createdExceptions.stream()
                .filter(e -> e.getExceptionType() == ExceptionType.MISSING_PARCEL).findFirst().orElseThrow();
        DeliveryException damagedEx = createdExceptions.stream()
                .filter(e -> e.getExceptionType() == ExceptionType.DAMAGED_PARCEL).findFirst().orElseThrow();
        assertThat(missingEx.getOrderId()).isEqualTo("ORD-102");
        assertThat(damagedEx.getEvidenceReference()).isEqualTo("https://cdn.swiftdrop.lk/evidence/damaged-105.jpg");

        // Locate missing parcel via MARK_FOUND_RESUME decision
        when(manifestParcelRepository.findByManifestIdAndOrderId(created.getId(), "ORD-102"))
                .thenReturn(manifestStore.get(created.getId()).getParcels().stream()
                        .filter(p -> "ORD-102".equals(p.getOrderId())).findFirst());

        DeliveryExceptionDto resolvedMissing = operationalExceptionService.applyDispatcherDecision(
                missingEx,
                DispatcherDecisionAction.MARK_FOUND_RESUME,
                new ExceptionDecisionRequest("MARK_FOUND_RESUME", "Found in auxiliary crate bay 2"),
                destDispatcher
        );
        assertThat(resolvedMissing.getStatus()).isEqualTo("RESOLVED");
        assertThat(jobStore).hasSize(2);

        TransferManifestDto completed = transferManifestService.completeManifest(
                created.getManifestCode(), "Missing parcel located and damaged parcel documented", destDispatcher);
        assertThat(completed.getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    void reportsOperationalExceptionsAndExecutesReturnToSenderLifecycle() {
        CreateTransferManifestRequest createReq = new CreateTransferManifestRequest();
        createReq.setOriginBranchId(1L);
        createReq.setDestinationBranchId(2L);
        createReq.setOrderIds(List.of("ORD-101"));
        TransferManifestDto manifest = transferManifestService.createManifest(createReq, originDispatcher);
        transferManifestService.assignCourier(manifest.getManifestCode(),
                new AssignTransferCourierRequest("CR-VAN-1", null), originDispatcher);

        // Unassigned courier cannot report exception on manifest
        ReportExceptionRequest delayReq = new ReportExceptionRequest();
        delayReq.setExceptionType("TRANSFER_DELAY");
        delayReq.setManifestId(manifest.getId());
        delayReq.setDescription("Highway congestion near Kadugannawa pass");
        assertThatThrownBy(() -> operationalExceptionService.reportException(delayReq, otherCourierPrincipal))
                .isInstanceOf(AccessDeniedException.class);

        // Assigned courier CAN report TRANSFER_DELAY with base64 evidence
        delayReq.setEvidenceReference("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        DeliveryExceptionDto reported = operationalExceptionService.reportException(delayReq, assignedCourierPrincipal);
        assertThat(reported.getExceptionCode()).startsWith("EXC-");
        assertThat(reported.getExceptionType()).isEqualTo("TRANSFER_DELAY");
        assertThat(reported.getStatus()).isEqualTo("OPEN");
        assertThat(reported.getEvidenceReference()).startsWith("pod-storage://");

        // Dispatcher advances status to UNDER_INVESTIGATION
        UpdateExceptionStatusRequest invReq = new UpdateExceptionStatusRequest();
        invReq.setStatus("UNDER_INVESTIGATION");
        invReq.setResolutionNotes("Monitoring ETA with linehaul courier");
        DeliveryExceptionDto investigating = operationalExceptionService
                .updateExceptionStatus(reported.getId(), invReq, originDispatcher);
        assertThat(investigating.getStatus()).isEqualTo("UNDER_INVESTIGATION");

        // Destination failed delivery job triggers Return-to-Sender via exception decision
        DeliveryJob failedJob = new DeliveryJob();
        failedJob.setId(500L);
        failedJob.setJobCode("JOB-500");
        failedJob.setOrderId("ORD-500");
        failedJob.setTrackingNumber("SD-500");
        failedJob.setBranchId(2L);
        failedJob.setBranchCode("KDY");
        failedJob.setBranchName("Kandy Hub");
        failedJob.setOriginBranchId(1L);
        failedJob.setOriginBranchCode("CMB");
        failedJob.setOriginBranchName("Colombo Hub");
        failedJob.setDestinationBranchId(2L);
        failedJob.setDestinationBranchCode("KDY");
        failedJob.setDestinationBranchName("Kandy Hub");
        failedJob.setSenderName("Lanka Apparel");
        failedJob.setSenderPhone("+94771112233");
        failedJob.setPickupAddress("42 Galle Rd, Colombo");
        failedJob.setRecipientName("Kasun Perera");
        failedJob.setRecipientPhone("+94770001111");
        failedJob.setDeliveryAddress("10 Peradeniya Rd, Kandy");
        failedJob.setParcelCategory("Apparel");
        failedJob.setStatus(DeliveryJobStatus.PENDING_DISPATCHER_DECISION);
        when(deliveryJobRepository.findById(500L)).thenReturn(Optional.of(failedJob));

        OrderSummaryDto ord500Summary = new OrderSummaryDto();
        ord500Summary.setOrderId("ORD-500");
        ord500Summary.setTrackingNumber("SD-500");
        ord500Summary.setOriginBranchId(1L);
        ord500Summary.setOriginBranchCode("CMB");
        ord500Summary.setOriginBranchName("Colombo Hub");
        ord500Summary.setDestinationBranchId(2L);
        ord500Summary.setDestinationBranchCode("KDY");
        ord500Summary.setDestinationBranchName("Kandy Hub");
        ord500Summary.setPickupContactName("Lanka Apparel");
        ord500Summary.setPickupContactPhone("+94771112233");
        ord500Summary.setPickupAddress("42 Galle Rd, Colombo");
        when(orderServiceClient.getOrderByIdOrTracking("ORD-500")).thenReturn(ord500Summary);

        ReportExceptionRequest rtsExReq = new ReportExceptionRequest();
        rtsExReq.setExceptionType("DELIVERY_FAILURE");
        rtsExReq.setDeliveryJobId(500L);
        rtsExReq.setDescription("Three delivery attempts exhausted; recipient unreachable");
        DeliveryExceptionDto failureEx = operationalExceptionService.reportException(rtsExReq, destDispatcher);
        assertThat(failureEx.getStatus()).isEqualTo("PENDING_DECISION");

        DeliveryException failureEntity = exceptionStore.get(failureEx.getId());
        DeliveryExceptionDto rtsDecided = operationalExceptionService.applyDispatcherDecision(
                failureEntity,
                DispatcherDecisionAction.RETURN_TO_SENDER,
                new ExceptionDecisionRequest("RETURN_TO_SENDER", "Return to Colombo merchant after 3 failed attempts"),
                destDispatcher
        );
        assertThat(rtsDecided.getStatus()).isEqualTo("RESOLVED");
        assertThat(rtsDecided.getReturnTaskId()).isNotNull();

        ReturnTaskDto rts = returnTaskService.getReturnTask(String.valueOf(rtsDecided.getReturnTaskId()), destDispatcher);
        assertThat(rts.getStatus()).isEqualTo("PENDING_ASSIGNMENT");
        assertThat(rts.getOriginBranchId()).isEqualTo(1L);
        assertThat(rts.getCurrentBranchId()).isEqualTo(2L);

        ReturnTaskDto assignedRts = returnTaskService.assignCourier(
                rts.getReturnCode(), new AssignTransferCourierRequest("CR-KDY-1", "Return bag CMB-02"), destDispatcher);
        assertThat(assignedRts.getStatus()).isEqualTo("COURIER_ASSIGNED");

        RecordReturnMovementRequest transitReq = new RecordReturnMovementRequest();
        transitReq.setStatus("IN_TRANSIT");
        transitReq.setLocation("Kegalle Transit Point");
        transitReq.setNotes("Departed Kandy Hub");
        ReturnTaskDto inTransitRts = returnTaskService.recordMovement(rts.getReturnCode(), transitReq, otherCourierPrincipal);
        assertThat(inTransitRts.getStatus()).isEqualTo("IN_TRANSIT");

        RecordReturnMovementRequest arrivedReq = new RecordReturnMovementRequest();
        arrivedReq.setStatus("AT_ORIGIN_BRANCH");
        arrivedReq.setBranchId(1L);
        arrivedReq.setLocation("Colombo Hub Return Bay");
        arrivedReq.setNotes("Checked in at origin branch");
        ReturnTaskDto atOriginRts = returnTaskService.recordMovement(rts.getReturnCode(), arrivedReq, originDispatcher);
        assertThat(atOriginRts.getStatus()).isEqualTo("AT_ORIGIN_BRANCH");
        assertThat(atOriginRts.getCurrentBranchId()).isEqualTo(1L);

        ConfirmReturnToSenderRequest confirmReq = new ConfirmReturnToSenderRequest();
        confirmReq.setSenderConfirmedBy("Lanka Apparel Intake Desk");
        confirmReq.setConfirmationReference("https://cdn.swiftdrop.lk/rts/sig-500.png");
        confirmReq.setNotes("Returned undamaged to merchant warehouse");
        ReturnTaskDto completedRts = returnTaskService.confirmReturnToSender(rts.getReturnCode(), confirmReq, originDispatcher);

        assertThat(completedRts.getStatus()).isEqualTo("RETURNED_TO_SENDER");
        assertThat(completedRts.getSenderConfirmedBy()).isEqualTo("Lanka Apparel Intake Desk");
        assertThat(completedRts.getReturnedAt()).isNotBlank();
        assertThat(failedJob.getStatus()).isEqualTo(DeliveryJobStatus.RETURNED_TO_SENDER);

        verify(orderServiceClient).notifyStatusTransition(
                eq("ORD-500"),
                argThat(p -> "RETURN_TO_SENDER".equals(p.getStatus())),
                anyString(),
                anyString()
        );
        verify(orderServiceClient).notifyStatusTransition(
                eq("ORD-500"),
                argThat(p -> "RETURNED_TO_SENDER".equals(p.getStatus())),
                anyString(),
                anyString()
        );
    }

    @Test
    void enforcesRoleAndBranchAuthorizationBoundaries() {
        CreateTransferManifestRequest req = new CreateTransferManifestRequest();
        req.setOriginBranchId(1L);
        req.setDestinationBranchId(2L);
        req.setOrderIds(List.of("ORD-101"));

        assertThatThrownBy(() -> transferManifestService.createManifest(req, customerUser))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> transferManifestService.createManifest(req, assignedCourierPrincipal))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> transferManifestService.createManifest(req, destDispatcher))
                .isInstanceOf(AccessDeniedException.class);

        TransferManifestDto manifest = transferManifestService.createManifest(req, originDispatcher);
        transferManifestService.assignCourier(manifest.getManifestCode(),
                new AssignTransferCourierRequest("CR-VAN-1", null), originDispatcher);
        transferManifestService.departManifest(manifest.getManifestCode(), null, assignedCourierPrincipal);

        // Origin dispatcher & courier CANNOT confirm receipt at destination branch!
        assertThatThrownBy(() -> transferManifestService.receiveManifest(manifest.getManifestCode(), null, originDispatcher))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> transferManifestService.receiveManifest(manifest.getManifestCode(), null, assignedCourierPrincipal))
                .isInstanceOf(AccessDeniedException.class);

        // Unassigned courier CANNOT query custody for manifest
        assertThatThrownBy(() -> custodyTrackingService.queryCustodyRecords(null, null, manifest.getId(), null, otherCourierPrincipal))
                .isInstanceOf(AccessDeniedException.class);

        // Assigned courier and both origin/dest dispatchers CAN query custody
        List<CustodyRecordDto> courierHistory = custodyTrackingService
                .queryCustodyRecords(null, null, manifest.getId(), null, assignedCourierPrincipal);
        assertThat(courierHistory).hasSize(1);
    }

    private void wireRepositoryDefaults() {
        lenient().when(manifestRepository.existsByManifestCodeIgnoreCase(anyString())).thenReturn(false);
        lenient().when(manifestRepository.save(any())).thenAnswer(inv -> {
            TransferManifest m = inv.getArgument(0);
            if (m.getId() == null) {
                m.setId(seq.incrementAndGet());
            }
            manifestStore.put(m.getId(), m);
            return m;
        });
        lenient().when(manifestRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(manifestStore.get(inv.getArgument(0))));
        lenient().when(manifestRepository.findByManifestCodeIgnoreCase(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            return manifestStore.values().stream()
                    .filter(m -> code.equalsIgnoreCase(m.getManifestCode())).findFirst();
        });

        lenient().when(manifestParcelRepository.existsConflictingActiveParcel(anyString(), anyString(), anyCollection(), anyCollection()))
                .thenReturn(false);

        lenient().when(pickupTaskRepository.findByOrderId("ORD-101")).thenReturn(Optional.of(parcel1));
        lenient().when(pickupTaskRepository.findByOrderId("ORD-102")).thenReturn(Optional.of(parcel2));
        lenient().when(pickupTaskRepository.findByOrderId("ORD-103")).thenReturn(Optional.of(sameBranchParcel));
        lenient().when(pickupTaskRepository.findByOrderId("ORD-104")).thenReturn(Optional.of(uncollectedParcel));

        lenient().when(courierRepository.findByCourierCodeIgnoreCase("CR-VAN-1")).thenReturn(Optional.of(originVanCourier));
        lenient().when(courierRepository.findByUserId("user-c1")).thenReturn(Optional.of(originVanCourier));
        lenient().when(courierRepository.findByCourierCodeIgnoreCase("CR-BIC-1")).thenReturn(Optional.of(originBicycleCourier));
        lenient().when(courierRepository.findByCourierCodeIgnoreCase("CR-KDY-1")).thenReturn(Optional.of(destBranchCourier));
        lenient().when(courierRepository.findByUserId("user-c99")).thenReturn(Optional.of(destBranchCourier));
        lenient().when(courierRepository.findByCourierCodeIgnoreCase("CR-OFF-1")).thenReturn(Optional.of(offlineCourier));
        lenient().when(courierRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        lenient().when(assignmentRepository.existsByAssignmentCodeIgnoreCase(anyString())).thenReturn(false);
        lenient().when(assignmentRepository.save(any())).thenAnswer(inv -> {
            CourierAssignment a = inv.getArgument(0);
            if (a.getId() == null) {
                a.setId(seq.incrementAndGet());
                assignmentStore.add(a);
            }
            return a;
        });
        lenient().when(assignmentRepository.findByTransferManifestIdOrderByAssignedAtDesc(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return assignmentStore.stream()
                    .filter(a -> a.getTransferManifest() != null && Objects.equals(a.getTransferManifest().getId(), id))
                    .toList();
        });
        lenient().when(assignmentRepository.findByReturnTaskIdOrderByAssignedAtDesc(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return assignmentStore.stream()
                    .filter(a -> a.getReturnTask() != null && Objects.equals(a.getReturnTask().getId(), id))
                    .toList();
        });
        lenient().when(assignmentRepository.countByCourierIdAndStatusIn(anyLong(), anyCollection())).thenReturn(0L);

        lenient().when(custodyRepository.existsByCustodyCodeIgnoreCase(anyString())).thenReturn(false);
        lenient().when(custodyRepository.save(any())).thenAnswer(inv -> {
            ParcelCustodyRecord rec = inv.getArgument(0);
            if (rec.getId() == null) {
                rec.setId(seq.incrementAndGet());
                custodyStore.add(rec);
            }
            return rec;
        });
        lenient().when(custodyRepository.findByManifestIdOrderByHandoverTimestampAsc(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return custodyStore.stream().filter(c -> Objects.equals(c.getManifestId(), id)).toList();
        });
        lenient().when(custodyRepository.findByReturnTaskIdOrderByHandoverTimestampAsc(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return custodyStore.stream().filter(c -> Objects.equals(c.getReturnTaskId(), id)).toList();
        });

        lenient().when(exceptionRepository.findByExceptionCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        lenient().when(exceptionRepository.save(any())).thenAnswer(inv -> {
            DeliveryException ex = inv.getArgument(0);
            if (ex.getId() == null) {
                ex.setId(seq.incrementAndGet());
            }
            exceptionStore.put(ex.getId(), ex);
            return ex;
        });
        lenient().when(exceptionRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(exceptionStore.get(inv.getArgument(0))));

        lenient().when(deliveryJobRepository.findByJobCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        lenient().when(deliveryJobRepository.findByOrderId(anyString())).thenAnswer(inv -> {
            String orderId = inv.getArgument(0);
            return jobStore.stream().filter(j -> orderId.equals(j.getOrderId())).findFirst();
        });
        lenient().when(deliveryJobRepository.existsByOrderId(anyString())).thenAnswer(inv -> {
            String orderId = inv.getArgument(0);
            return jobStore.stream().anyMatch(j -> orderId.equals(j.getOrderId()));
        });
        lenient().when(deliveryJobRepository.save(any())).thenAnswer(inv -> {
            DeliveryJob j = inv.getArgument(0);
            if (j.getId() == null) {
                j.setId(seq.incrementAndGet());
                jobStore.add(j);
            }
            return j;
        });

        lenient().when(returnTaskRepository.existsByReturnCodeIgnoreCase(anyString())).thenReturn(false);
        lenient().when(returnTaskRepository.save(any())).thenAnswer(inv -> {
            ReturnTask r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(seq.incrementAndGet());
            }
            returnStore.put(r.getId(), r);
            return r;
        });
        lenient().when(returnTaskRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(returnStore.get(inv.getArgument(0))));
        lenient().when(returnTaskRepository.findByReturnCodeIgnoreCase(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            return returnStore.values().stream().filter(r -> code.equalsIgnoreCase(r.getReturnCode())).findFirst();
        });
        lenient().when(returnTaskRepository.findFirstByOrderIdOrderByCreatedAtDesc(anyString())).thenAnswer(inv -> {
            String orderId = inv.getArgument(0);
            return returnStore.values().stream().filter(r -> orderId.equals(r.getOrderId())).findFirst();
        });
    }

    private CourierProfileEntity courier(
            Long id,
            String code,
            String userId,
            String email,
            String name,
            Long branchId,
            String branchCode,
            String branchName,
            VehicleType vehicle,
            CourierAvailabilityStatus availability,
            int maxCapacity) {
        CourierProfileEntity entity = new CourierProfileEntity();
        entity.setId(id);
        entity.setCourierCode(code);
        entity.setUserId(userId);
        entity.setEmail(email);
        entity.setName(name);
        entity.setPhone("+94771234567");
        entity.setBranchId(branchId);
        entity.setBranchCode(branchCode);
        entity.setBranchName(branchName);
        entity.setZone(branchName + " Central");
        entity.setVehicleType(vehicle);
        entity.setVehiclePlate("WP-" + code);
        entity.setAvailabilityStatus(availability);
        entity.setMaxCapacity(maxCapacity);
        return entity;
    }

    private PickupTask pickupTask(
            Long id,
            String taskCode,
            String orderId,
            String tracking,
            Long originBranchId,
            String originCode,
            String originName,
            Long destBranchId,
            String destCode,
            String destName,
            boolean sameBranch,
            PickupTaskStatus status,
            BigDecimal weightKg) {
        PickupTask t = new PickupTask();
        t.setId(id);
        t.setTaskCode(taskCode);
        t.setOrderId(orderId);
        t.setTrackingNumber(tracking);
        t.setOriginBranchId(originBranchId);
        t.setOriginBranchCode(originCode);
        t.setOriginBranchName(originName);
        t.setDestinationBranchId(destBranchId);
        t.setDestinationBranchCode(destCode);
        t.setDestinationBranchName(destName);
        t.setSameBranch(sameBranch);
        t.setStatus(status);
        t.setWeightKg(weightKg);
        t.setParcelCategory("Electronics");
        t.setSenderName("Sender " + orderId);
        t.setSenderPhone("+94771111111");
        t.setPickupAddress("10 Union Place");
        t.setRecipientName("Recipient " + orderId);
        t.setRecipientPhone("+94772222222");
        t.setDropoffAddress("20 Hill St");
        t.setPickedUpAt(LocalDateTime.now().minusHours(2));
        return t;
    }
}

