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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DispatchServiceTest {

    @TempDir
    Path tempDir;

    @Mock
    private CourierProfileRepository courierRepository;
    @Mock
    private PickupTaskRepository pickupTaskRepository;
    @Mock
    private DeliveryJobRepository deliveryJobRepository;
    @Mock
    private CourierAssignmentRepository assignmentRepository;
    @Mock
    private DeliveryAttemptRepository attemptRepository;
    @Mock
    private ProofOfDeliveryRepository podRepository;
    @Mock
    private DeliveryExceptionRepository exceptionRepository;
    @Mock
    private OrderServiceClient orderServiceClient;
    @Mock
    private DispatchEventPublisher eventPublisher;

    private PodEvidenceStorageService podStorageService;
    private DispatchService dispatchService;

    private DispatchUserPrincipal branch1Dispatcher;
    private DispatchUserPrincipal branch2Dispatcher;
    private DispatchUserPrincipal adminPrincipal;
    private DispatchUserPrincipal courier101Principal;
    private DispatchUserPrincipal courier102Principal;

    private CourierProfileEntity courier101;
    private CourierProfileEntity courier102;

    @BeforeEach
    void setUp() {
        podStorageService = new PodEvidenceStorageService(tempDir.toString());
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

        branch1Dispatcher = new DispatchUserPrincipal("disp-1", "disp1@swiftdrop.lk", List.of("DISPATCHER"), 1L);
        branch2Dispatcher = new DispatchUserPrincipal("disp-2", "disp2@swiftdrop.lk", List.of("DISPATCHER"), 2L);
        adminPrincipal = new DispatchUserPrincipal("admin-1", "admin@swiftdrop.lk", List.of("ADMIN"), null);
        courier101Principal = new DispatchUserPrincipal("courier-101", "kamal.silva@swiftdrop.lk", List.of("COURIER"), 1L);
        courier102Principal = new DispatchUserPrincipal("courier-102", "sunil.w@swiftdrop.lk", List.of("COURIER"), 1L);

        courier101 = new CourierProfileEntity();
        courier101.setId(1L);
        courier101.setCourierCode("CR-101");
        courier101.setUserId("courier-101");
        courier101.setName("Kamal Silva");
        courier101.setPhone("+94 77 123 4567");
        courier101.setEmail("kamal.silva@swiftdrop.lk");
        courier101.setVehicleType(VehicleType.MOTORCYCLE);
        courier101.setVehiclePlate("WP BDF-8942");
        courier101.setBranchId(1L);
        courier101.setBranchCode("CMB-CENTRAL");
        courier101.setBranchName("Colombo Central Hub");
        courier101.setZone("Zone A");
        courier101.setAvailabilityStatus(CourierAvailabilityStatus.AVAILABLE);
        courier101.setMaxCapacity(8);

        courier102 = new CourierProfileEntity();
        courier102.setId(2L);
        courier102.setCourierCode("CR-102");
        courier102.setUserId("courier-102");
        courier102.setName("Sunil Wickramasinghe");
        courier102.setPhone("+94 71 987 6543");
        courier102.setEmail("sunil.w@swiftdrop.lk");
        courier102.setVehicleType(VehicleType.VAN);
        courier102.setVehiclePlate("WP CAS-4412");
        courier102.setBranchId(1L);
        courier102.setBranchCode("CMB-CENTRAL");
        courier102.setBranchName("Colombo Central Hub");
        courier102.setZone("Zone B");
        courier102.setAvailabilityStatus(CourierAvailabilityStatus.AVAILABLE);
        courier102.setMaxCapacity(10);
    }

    private CreateOperationalTaskRequest buildSampleTaskRequest(String pickupMethod) {
        CreateOperationalTaskRequest req = new CreateOperationalTaskRequest();
        req.setOrderId("501");
        req.setTrackingNumber("SD-50101");
        req.setPickupMethod(pickupMethod);
        req.setPriority("HIGH");
        req.setOriginBranchId(1L);
        req.setOriginBranchCode("CMB-CENTRAL");
        req.setOriginBranchName("Colombo Central Hub");
        req.setDestinationBranchId(1L);
        req.setDestinationBranchCode("CMB-CENTRAL");
        req.setDestinationBranchName("Colombo Central Hub");
        req.setSameBranch(true);
        req.setSenderName("Luxe Beauty LK");
        req.setSenderPhone("+94771112222");
        req.setPickupAddress("10 Duplication Rd, Colombo 03");
        req.setRecipientName("Ayesha Perera");
        req.setRecipientPhone("+94773334444");
        req.setDeliveryAddress("42 Galle Rd, Colombo 03");
        req.setParcelCategory("Cosmetics");
        req.setParcelSize("SMALL");
        req.setWeightKg(new BigDecimal("1.50"));
        req.setDistanceKm(new BigDecimal("4.20"));
        req.setDeliveryFee(new BigDecimal("720.00"));
        return req;
    }

    @Test
    void createPickupTask_CourierPickup_CreatesPendingPickupTask() {
        CreateOperationalTaskRequest req = buildSampleTaskRequest("COURIER_PICKUP");
        when(pickupTaskRepository.findByOrderId("501")).thenReturn(Optional.empty());
        when(pickupTaskRepository.save(any(PickupTask.class))).thenAnswer(inv -> {
            PickupTask t = inv.getArgument(0);
            t.setId(10L);
            return t;
        });

        PickupTaskDto dto = dispatchService.createPickupTask(req, branch1Dispatcher);

        assertNotNull(dto);
        assertEquals("501", dto.getOrderId());
        assertEquals("SD-50101", dto.getTrackingNumber());
        assertEquals("COURIER_PICKUP", dto.getPickupMethod());
        assertEquals("PENDING_ASSIGNMENT", dto.getStatus());
        verify(pickupTaskRepository).save(any(PickupTask.class));
    }

    @Test
    void createPickupTask_BranchDropoff_RejectsUnnecessaryCourierPickupTask() {
        CreateOperationalTaskRequest req = buildSampleTaskRequest("BRANCH_DROPOFF");

        DispatchValidationException ex = assertThrows(
                DispatchValidationException.class,
                () -> dispatchService.createPickupTask(req, branch1Dispatcher)
        );
        assertEquals("BRANCH_DROPOFF_NO_PICKUP_TASK", ex.getErrorCode());
        verify(pickupTaskRepository, never()).save(any());
    }

    @Test
    void confirmBranchDropoff_RecordsBranchEmployeeTimestampAndParcelRefWithoutCourierTask() {
        BranchDropoffConfirmRequest req = new BranchDropoffConfirmRequest();
        req.setOrderId("502");
        req.setTrackingNumber("SD-50202");
        req.setBranchId(1L);
        req.setBranchCode("CMB-CENTRAL");
        req.setBranchName("Colombo Central Hub");
        req.setEmployeeId("EMP-88");
        req.setEmployeeName("Nadeesha Jayasinghe");
        req.setParcelReference("PRC-SD-50202");

        when(orderServiceClient.getOrderByIdOrTracking("502")).thenThrow(new RuntimeException("Offline fallback"));
        when(pickupTaskRepository.findByOrderId("502")).thenReturn(Optional.empty());
        when(pickupTaskRepository.findByTrackingNumberIgnoreCase("SD-50202")).thenReturn(Optional.empty());
        when(pickupTaskRepository.save(any(PickupTask.class))).thenAnswer(inv -> {
            PickupTask t = inv.getArgument(0);
            t.setId(11L);
            return t;
        });
        when(deliveryJobRepository.existsByOrderId("502")).thenReturn(false);
        when(deliveryJobRepository.save(any(DeliveryJob.class))).thenAnswer(inv -> inv.getArgument(0));

        PickupTaskDto confirmed = dispatchService.confirmBranchDropoff(req, branch1Dispatcher);

        assertEquals("BRANCH_DROPOFF", confirmed.getPickupMethod());
        assertEquals("BRANCH_RECEIVED", confirmed.getStatus());
        assertEquals("EMP-88", confirmed.getBranchConfirmedByEmployeeId());
        assertEquals("Nadeesha Jayasinghe", confirmed.getBranchConfirmedByEmployeeName());
        assertEquals("PRC-SD-50202", confirmed.getParcelReference());
        assertNotNull(confirmed.getBranchConfirmedAt());
        assertNull(confirmed.getAssignedCourierId());
        verify(assignmentRepository, never()).save(any());
        verify(orderServiceClient).notifyBranchDropoff(eq("502"), anyString(), eq("EMP-88"), eq("DISPATCHER"));
        verify(deliveryJobRepository).save(any(DeliveryJob.class));
    }

    @Test
    void assignCourier_ValidatesEligibilityAndReassignmentRecordsHistory() {
        DeliveryJob job = new DeliveryJob();
        job.setId(20L);
        job.setJobCode("DLV-20001");
        job.setOrderId("501");
        job.setTrackingNumber("SD-50101");
        job.setStatus(DeliveryJobStatus.UNASSIGNED);
        job.setPriority(DeliveryPriority.HIGH);
        job.setBranchId(1L);
        job.setBranchCode("CMB-CENTRAL");
        job.setBranchName("Colombo Central Hub");
        job.setOriginBranchId(1L);
        job.setOriginBranchCode("CMB-CENTRAL");
        job.setOriginBranchName("Colombo Central Hub");
        job.setDestinationBranchId(1L);
        job.setDestinationBranchCode("CMB-CENTRAL");
        job.setDestinationBranchName("Colombo Central Hub");
        job.setSenderName("Luxe Beauty LK");
        job.setSenderPhone("+94771112222");
        job.setPickupAddress("10 Duplication Rd");
        job.setRecipientName("Ayesha Perera");
        job.setRecipientPhone("+94773334444");
        job.setDeliveryAddress("42 Galle Rd, Colombo 03");
        job.setParcelCategory("Cosmetics");
        job.setWeightKg(new BigDecimal("1.50"));

        when(courierRepository.findByCourierCodeIgnoreCase("CR-101")).thenReturn(Optional.of(courier101));
        when(courierRepository.findByCourierCodeIgnoreCase("CR-102")).thenReturn(Optional.of(courier102));
        when(deliveryJobRepository.findByOrderId("501")).thenReturn(Optional.of(job));
        when(assignmentRepository.existsByAssignmentCodeIgnoreCase(anyString())).thenReturn(false);
        when(assignmentRepository.countByCourierIdAndStatusIn(anyLong(), anyCollection())).thenReturn(1L);
        when(deliveryJobRepository.save(any(DeliveryJob.class))).thenAnswer(inv -> inv.getArgument(0));
        when(courierRepository.save(any(CourierProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        final CourierAssignment[] savedHolder = new CourierAssignment[1];
        when(assignmentRepository.save(any(CourierAssignment.class))).thenAnswer(inv -> {
            CourierAssignment a = inv.getArgument(0);
            if (a.getId() == null) {
                a.setId(30L);
            }
            savedHolder[0] = a;
            return a;
        });

        AssignCourierRequest assignReq = new AssignCourierRequest();
        assignReq.setOrderId("501");
        assignReq.setCourierId("CR-101");
        assignReq.setPriority("HIGH");

        AssignmentRecordDto created = dispatchService.assignCourier(assignReq, branch1Dispatcher);
        assertEquals("501", created.getOrderId());
        assertEquals("CR-101", created.getCourier().getCode());
        assertEquals("ASSIGNED", created.getStatus());
        assertEquals(1, created.getHistory().size());

        // Now test reassignment to CR-102
        when(assignmentRepository.findByAssignmentCodeIgnoreCase(created.getAssignmentCode()))
                .thenReturn(Optional.of(savedHolder[0]));

        ReassignCourierRequest reassignReq = new ReassignCourierRequest();
        reassignReq.setAssignmentId(created.getAssignmentCode());
        reassignReq.setOrderId("501");
        reassignReq.setCurrentCourierId("CR-101");
        reassignReq.setNewCourierId("CR-102");
        reassignReq.setReason("Courier CR-101 reported flat tire");

        AssignmentRecordDto reassigned = dispatchService.reassignCourier(
                created.getAssignmentCode(),
                reassignReq,
                branch1Dispatcher
        );

        assertEquals("CR-102", reassigned.getCourier().getCode());
        assertEquals("REASSIGNED", reassigned.getStatus());
        assertEquals(2, reassigned.getHistory().size());
        assertEquals("Kamal Silva", reassigned.getHistory().get(1).getFromCourierName());
        assertEquals("Sunil Wickramasinghe", reassigned.getHistory().get(1).getToCourierName());
        assertEquals("Courier CR-101 reported flat tire", reassigned.getHistory().get(1).getReason());
    }

    @Test
    void assignCourier_RejectsCourierAtMaxCapacityOrOffline() {
        DeliveryJob job = new DeliveryJob();
        job.setId(21L);
        job.setJobCode("DLV-20002");
        job.setOrderId("503");
        job.setTrackingNumber("SD-50303");
        job.setStatus(DeliveryJobStatus.UNASSIGNED);
        job.setBranchId(1L);
        job.setWeightKg(new BigDecimal("2.00"));

        when(deliveryJobRepository.findByOrderId("503")).thenReturn(Optional.of(job));
        when(courierRepository.findByCourierCodeIgnoreCase("CR-101")).thenReturn(Optional.of(courier101));
        // Simulate courier at max capacity (8/8)
        when(assignmentRepository.countByCourierIdAndStatusIn(eq(1L), anyCollection())).thenReturn(8L);

        AssignCourierRequest req = new AssignCourierRequest();
        req.setOrderId("503");
        req.setCourierId("CR-101");

        DispatchValidationException capEx = assertThrows(
                DispatchValidationException.class,
                () -> dispatchService.assignCourier(req, branch1Dispatcher)
        );
        assertEquals("COURIER_AT_CAPACITY", capEx.getErrorCode());

        // Simulate offline courier
        courier101.setAvailabilityStatus(CourierAvailabilityStatus.OFFLINE);
        DispatchValidationException offlineEx = assertThrows(
                DispatchValidationException.class,
                () -> dispatchService.assignCourier(req, branch1Dispatcher)
        );
        assertEquals("COURIER_UNAVAILABLE", offlineEx.getErrorCode());
    }

    @Test
    void pickupConfirmation_CourierAcceptsAndMarksPickedUp_NotifiesOrderServiceAndCreatesSameBranchJob() {
        PickupTask pickupTask = new PickupTask();
        pickupTask.setId(15L);
        pickupTask.setTaskCode("PKP-15001");
        pickupTask.setOrderId("505");
        pickupTask.setTrackingNumber("SD-50505");
        pickupTask.setPickupMethod(PickupMethod.COURIER_PICKUP);
        pickupTask.setStatus(PickupTaskStatus.ASSIGNED);
        pickupTask.setPriority(DeliveryPriority.NORMAL);
        pickupTask.setOriginBranchId(1L);
        pickupTask.setOriginBranchCode("CMB-CENTRAL");
        pickupTask.setOriginBranchName("Colombo Central Hub");
        pickupTask.setDestinationBranchId(1L);
        pickupTask.setDestinationBranchCode("CMB-CENTRAL");
        pickupTask.setDestinationBranchName("Colombo Central Hub");
        pickupTask.setSameBranch(true);
        pickupTask.setSenderName("Sender");
        pickupTask.setSenderPhone("+94771111111");
        pickupTask.setPickupAddress("10 Duplication Rd");
        pickupTask.setRecipientName("Recipient");
        pickupTask.setRecipientPhone("+94772222222");
        pickupTask.setDropoffAddress("42 Galle Rd");
        pickupTask.setParcelCategory("Books");
        pickupTask.setWeightKg(BigDecimal.ONE);
        pickupTask.setDistanceKm(new BigDecimal("3.50"));
        pickupTask.setDeliveryFee(new BigDecimal("550.00"));

        CourierAssignment assignment = new CourierAssignment();
        assignment.setId(40L);
        assignment.setAssignmentCode("ASN-4001");
        assignment.setTaskType(AssignmentTaskType.PICKUP);
        assignment.setPickupTask(pickupTask);
        assignment.setOrderId("505");
        assignment.setTrackingNumber("SD-50505");
        assignment.setBranchId(1L);
        assignment.setBranchCode("CMB-CENTRAL");
        assignment.setBranchName("Colombo Central Hub");
        assignment.setCourier(courier101);
        assignment.setStatus(AssignmentStatus.ASSIGNED);

        when(assignmentRepository.findByAssignmentCodeIgnoreCase("ASN-4001")).thenReturn(Optional.of(assignment));
        when(pickupTaskRepository.save(any(PickupTask.class))).thenAnswer(inv -> inv.getArgument(0));
        when(assignmentRepository.save(any(CourierAssignment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(courierRepository.save(any(CourierProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(deliveryJobRepository.existsByOrderId("505")).thenReturn(false);
        when(deliveryJobRepository.save(any(DeliveryJob.class))).thenAnswer(inv -> inv.getArgument(0));

        DeliveryJobDto accepted = dispatchService.acceptAssignment("ASN-4001", courier101Principal);
        assertEquals("ACCEPTED", accepted.getStatus());
        assertEquals(PickupTaskStatus.ACCEPTED, pickupTask.getStatus());

        DeliveryJobDto pickedUp = dispatchService.markPickedUp("ASN-4001", courier101Principal);
        assertEquals("DELIVERED", pickedUp.getStatus());
        assertEquals(PickupTaskStatus.PICKED_UP, pickupTask.getStatus());
        assertNotNull(pickupTask.getPickedUpAt());
        org.mockito.ArgumentCaptor<OrderStatusTransitionPayload> statusCaptor =
                org.mockito.ArgumentCaptor.forClass(OrderStatusTransitionPayload.class);
        verify(orderServiceClient, times(1)).notifyStatusTransition(eq("505"), statusCaptor.capture(), eq("courier-101"), eq("COURIER"));
        assertEquals("PICKED_UP", statusCaptor.getValue().getStatus());
        verify(deliveryJobRepository).save(any(DeliveryJob.class));
    }

    @Test
    void pickupConfirmation_InterBranchOrder_TransitionsToPickedUpAndAtOriginBranchForTransfer() {
        PickupTask pickupTask = new PickupTask();
        pickupTask.setId(16L);
        pickupTask.setTaskCode("PKP-16001");
        pickupTask.setOrderId("515");
        pickupTask.setTrackingNumber("SD-51515");
        pickupTask.setPickupMethod(PickupMethod.COURIER_PICKUP);
        pickupTask.setStatus(PickupTaskStatus.ACCEPTED);
        pickupTask.setPriority(DeliveryPriority.NORMAL);
        pickupTask.setOriginBranchId(1L);
        pickupTask.setOriginBranchCode("CMB-CENTRAL");
        pickupTask.setOriginBranchName("Colombo Central Hub");
        pickupTask.setDestinationBranchId(2L);
        pickupTask.setDestinationBranchCode("KDY-MAIN");
        pickupTask.setDestinationBranchName("Kandy Main Hub");
        pickupTask.setSameBranch(false);
        pickupTask.setPickupAddress("10 Duplication Rd, Colombo");
        pickupTask.setDropoffAddress("20 Peradeniya Rd, Kandy");
        pickupTask.setWeightKg(BigDecimal.ONE);

        CourierAssignment assignment = new CourierAssignment();
        assignment.setId(41L);
        assignment.setAssignmentCode("ASN-4002");
        assignment.setTaskType(AssignmentTaskType.PICKUP);
        assignment.setPickupTask(pickupTask);
        assignment.setOrderId("515");
        assignment.setTrackingNumber("SD-51515");
        assignment.setBranchId(1L);
        assignment.setCourier(courier101);
        assignment.setStatus(AssignmentStatus.ACCEPTED);

        when(assignmentRepository.findByAssignmentCodeIgnoreCase("ASN-4002")).thenReturn(Optional.of(assignment));
        when(pickupTaskRepository.save(any(PickupTask.class))).thenAnswer(inv -> inv.getArgument(0));
        when(assignmentRepository.save(any(CourierAssignment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(courierRepository.save(any(CourierProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        dispatchService.markPickedUp("ASN-4002", courier101Principal);

        org.mockito.ArgumentCaptor<OrderStatusTransitionPayload> statusCaptor =
                org.mockito.ArgumentCaptor.forClass(OrderStatusTransitionPayload.class);
        verify(orderServiceClient, times(2)).notifyStatusTransition(eq("515"), statusCaptor.capture(), eq("courier-101"), eq("COURIER"));
        assertEquals(List.of("PICKED_UP", "AT_ORIGIN_BRANCH"),
                statusCaptor.getAllValues().stream().map(OrderStatusTransitionPayload::getStatus).toList());
        verify(deliveryJobRepository, never()).save(any(DeliveryJob.class));
    }

    @Test
    void completeDelivery_RecordsProofOfDeliveryAndNotifiesOrderService() {
        DeliveryJob job = new DeliveryJob();
        job.setId(25L);
        job.setJobCode("DLV-25001");
        job.setOrderId("506");
        job.setTrackingNumber("SD-50606");
        job.setStatus(DeliveryJobStatus.IN_TRANSIT);
        job.setBranchId(1L);
        job.setBranchCode("CMB-CENTRAL");
        job.setBranchName("Colombo Central Hub");
        job.setSenderName("Sender");
        job.setSenderPhone("+94771111111");
        job.setPickupAddress("10 Duplication Rd");
        job.setRecipientName("Ayesha Perera");
        job.setRecipientPhone("+94772222222");
        job.setDeliveryAddress("42 Galle Rd, Colombo 03");
        job.setParcelCategory("Electronics");
        job.setWeightKg(new BigDecimal("2.00"));
        job.setDistanceKm(new BigDecimal("5.00"));
        job.setPayoutLkr(new BigDecimal("450.00"));

        CourierAssignment assignment = new CourierAssignment();
        assignment.setId(45L);
        assignment.setAssignmentCode("ASN-4501");
        assignment.setTaskType(AssignmentTaskType.DELIVERY);
        assignment.setDeliveryJob(job);
        assignment.setOrderId("506");
        assignment.setTrackingNumber("SD-50606");
        assignment.setBranchId(1L);
        assignment.setBranchCode("CMB-CENTRAL");
        assignment.setBranchName("Colombo Central Hub");
        assignment.setCourier(courier101);
        assignment.setStatus(AssignmentStatus.IN_TRANSIT);

        when(assignmentRepository.findByAssignmentCodeIgnoreCase("ASN-4501")).thenReturn(Optional.of(assignment));
        when(podRepository.findByDeliveryJobId(25L)).thenReturn(Optional.empty());
        when(deliveryJobRepository.save(any(DeliveryJob.class))).thenAnswer(inv -> inv.getArgument(0));
        when(assignmentRepository.save(any(CourierAssignment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(courierRepository.save(any(CourierProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ProofOfDeliveryRequest podReq = new ProofOfDeliveryRequest();
        podReq.setRecipientName("Ayesha Perera");
        podReq.setProofType("SIGNATURE");
        podReq.setSignatureReference("sig-ref-50606");
        podReq.setParcelReference("PRC-SD-50606");

        DeliveryJobDto completed = dispatchService.completeDelivery("ASN-4501", podReq, courier101Principal);

        assertEquals("DELIVERED", completed.getStatus());
        assertNotNull(completed.getProofOfDelivery());
        assertEquals("Ayesha Perera", completed.getProofOfDelivery().getReceivedBy());
        assertEquals("SIGNATURE", completed.getProofOfDelivery().getType());
        assertTrue(completed.getProofOfDelivery().getSignatureReference().startsWith("pod-storage://sig/SD-50606/"));
        assertEquals(1, completed.getAttemptCount());
        verify(orderServiceClient).notifyStatusTransition(eq("506"), any(), eq("courier-101"), eq("COURIER"));
    }

    @Test
    void failedDelivery_EnforcesMaxThreeAttemptsAndEscalatesToDispatcherExceptionAndResolves() {
        DeliveryJob job = new DeliveryJob();
        job.setId(26L);
        job.setJobCode("DLV-26001");
        job.setOrderId("507");
        job.setTrackingNumber("SD-50707");
        job.setStatus(DeliveryJobStatus.IN_TRANSIT);
        job.setBranchId(1L);
        job.setBranchCode("CMB-CENTRAL");
        job.setBranchName("Colombo Central Hub");
        job.setSenderName("Sender");
        job.setSenderPhone("+94771111111");
        job.setPickupAddress("10 Duplication Rd");
        job.setRecipientName("Nipuna Senanayake");
        job.setRecipientPhone("+94772222222");
        job.setDeliveryAddress("15 Park Street, Colombo 02");
        job.setParcelCategory("Apparel");
        job.setWeightKg(BigDecimal.ONE);
        job.setMaxAttempts(3);

        CourierAssignment assignment = new CourierAssignment();
        assignment.setId(46L);
        assignment.setAssignmentCode("ASN-4601");
        assignment.setTaskType(AssignmentTaskType.DELIVERY);
        assignment.setDeliveryJob(job);
        assignment.setOrderId("507");
        assignment.setTrackingNumber("SD-50707");
        assignment.setBranchId(1L);
        assignment.setBranchCode("CMB-CENTRAL");
        assignment.setBranchName("Colombo Central Hub");
        assignment.setCourier(courier101);
        assignment.setStatus(AssignmentStatus.IN_TRANSIT);

        final DeliveryException[] savedException = new DeliveryException[1];
        when(assignmentRepository.findByAssignmentCodeIgnoreCase("ASN-4601")).thenReturn(Optional.of(assignment));
        when(deliveryJobRepository.save(any(DeliveryJob.class))).thenAnswer(inv -> inv.getArgument(0));
        when(assignmentRepository.save(any(CourierAssignment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(courierRepository.save(any(CourierProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(exceptionRepository.findByDeliveryJobIdAndStatus(eq(26L), eq(ExceptionStatus.PENDING_DECISION)))
                .thenReturn(Optional.empty());
        when(exceptionRepository.save(any(DeliveryException.class))).thenAnswer(inv -> {
            DeliveryException ex = inv.getArgument(0);
            ex.setId(99L);
            savedException[0] = ex;
            return ex;
        });

        // Attempt 1 -> FAILED
        dispatchService.recordFailedDelivery(
                "ASN-4601",
                new FailedDeliveryRequest("Recipient not available", "Gate locked"),
                courier101Principal
        );
        assertEquals(1, job.getAttemptCount());
        assertEquals(DeliveryJobStatus.FAILED, job.getStatus());

        // Attempt 2 -> FAILED
        dispatchService.recordFailedDelivery(
                "ASN-4601",
                new FailedDeliveryRequest("Unable to reach recipient by phone", "No answer"),
                courier101Principal
        );
        assertEquals(2, job.getAttemptCount());
        assertEquals(DeliveryJobStatus.FAILED, job.getStatus());

        // Attempt 3 -> Escalates to PENDING_DISPATCHER_DECISION & creates DeliveryException
        dispatchService.recordFailedDelivery(
                "ASN-4601",
                new FailedDeliveryRequest("Recipient refused the parcel", "Refused at doorstep"),
                courier101Principal
        );
        assertEquals(3, job.getAttemptCount());
        assertEquals(DeliveryJobStatus.PENDING_DISPATCHER_DECISION, job.getStatus());
        assertNotNull(savedException[0]);
        assertEquals(ExceptionStatus.PENDING_DECISION, savedException[0].getStatus());
        assertEquals(3, savedException[0].getFailedAttemptCount());

        // Attempt 4 -> Blocked by max retry enforcement
        DispatchValidationException maxEx = assertThrows(
                DispatchValidationException.class,
                () -> dispatchService.recordFailedDelivery(
                        "ASN-4601",
                        new FailedDeliveryRequest("Recipient not available", "4th attempt"),
                        courier101Principal
                )
        );
        assertEquals("MAX_ATTEMPTS_EXCEEDED", maxEx.getErrorCode());

        // Dispatcher resolves exception -> RETURN_TO_SENDER
        when(exceptionRepository.findById(99L)).thenReturn(Optional.of(savedException[0]));
        DeliveryExceptionDto resolved = dispatchService.resolveException(
                "99",
                new ExceptionDecisionRequest("RETURN_TO_SENDER", "Recipient refused after 3 attempts; return to merchant"),
                branch1Dispatcher
        );

        assertEquals("RESOLVED", resolved.getStatus());
        assertEquals("RETURN_TO_SENDER", resolved.getDecisionAction());
        assertEquals("disp-1", resolved.getDecidedById());
        assertNotNull(resolved.getDecidedAt());
        assertEquals(DeliveryJobStatus.RETURN_TO_SENDER, job.getStatus());
    }

    @Test
    void authorizationBoundaries_EnforcesCourierOwnershipAndBranchScopeAndAdminAccess() {
        CourierAssignment assignment = new CourierAssignment();
        assignment.setId(50L);
        assignment.setAssignmentCode("ASN-5001");
        assignment.setTaskType(AssignmentTaskType.DELIVERY);
        assignment.setOrderId("508");
        assignment.setTrackingNumber("SD-50808");
        assignment.setBranchId(1L);
        assignment.setBranchCode("CMB-CENTRAL");
        assignment.setBranchName("Colombo Central Hub");
        assignment.setCourier(courier101);
        assignment.setStatus(AssignmentStatus.ASSIGNED);

        when(assignmentRepository.findByAssignmentCodeIgnoreCase("ASN-5001")).thenReturn(Optional.of(assignment));

        // 1. Courier 102 cannot accept Courier 101's assignment
        assertThrows(
                AccessDeniedException.class,
                () -> dispatchService.acceptAssignment("ASN-5001", courier102Principal)
        );

        // 2. Courier cannot create pickup tasks or confirm branch drop-off
        CreateOperationalTaskRequest taskReq = buildSampleTaskRequest("COURIER_PICKUP");
        assertThrows(
                AccessDeniedException.class,
                () -> dispatchService.createPickupTask(taskReq, courier101Principal)
        );

        // 3. Branch 2 Dispatcher cannot manage Branch 1 assignment or create Branch 1 task
        assertThrows(
                AccessDeniedException.class,
                () -> dispatchService.getAssignmentById("ASN-5001", branch2Dispatcher)
        );
        assertThrows(
                AccessDeniedException.class,
                () -> dispatchService.createPickupTask(taskReq, branch2Dispatcher)
        );

        // 4. Head Office ADMIN can access Branch 1 assignment across branches
        AssignmentRecordDto adminView = dispatchService.getAssignmentById("ASN-5001", adminPrincipal);
        assertEquals("ASN-5001", adminView.getAssignmentCode());

        // 5. Dispatcher cannot accept assignment on behalf of courier
        assertThrows(
                AccessDeniedException.class,
                () -> dispatchService.acceptAssignment("ASN-5001", branch1Dispatcher)
        );

        // 6. Dispatcher with null branchId fails closed
        DispatchUserPrincipal nullBranchDispatcher =
                new DispatchUserPrincipal("disp-null", "dispnull@swiftdrop.lk", List.of("DISPATCHER"), null);
        assertThrows(
                AccessDeniedException.class,
                () -> dispatchService.getAssignmentById("ASN-5001", nullBranchDispatcher)
        );
        assertThrows(
                AccessDeniedException.class,
                () -> dispatchService.createPickupTask(taskReq, nullBranchDispatcher)
        );
    }

    @Test
    void listPickupTasks_ReconcilesConfirmedBranchOrdersFromOrderServiceAndIncludesBranchDropoff() {
        OrderSummaryDto confirmedPickupOrder = new OrderSummaryDto();
        confirmedPickupOrder.setId(601L);
        confirmedPickupOrder.setOrderId("601");
        confirmedPickupOrder.setTrackingNumber("SD-52711");
        confirmedPickupOrder.setStatus("CONFIRMED");
        confirmedPickupOrder.setPickupMethod("COURIER_PICKUP");
        confirmedPickupOrder.setOriginBranchId(1L);
        confirmedPickupOrder.setOriginBranchCode("CMB-1");
        confirmedPickupOrder.setOriginBranchName("Colombo Hub 1");
        confirmedPickupOrder.setDestinationBranchId(2L);
        confirmedPickupOrder.setDestinationBranchCode("KDY-2");
        confirmedPickupOrder.setDestinationBranchName("Kandy Hub 2");
        confirmedPickupOrder.setSameBranch(false);
        confirmedPickupOrder.setPickupAddress("10 Duplication Rd, Colombo 03");
        confirmedPickupOrder.setDropoffAddress("20 Peradeniya Rd, Kandy");
        confirmedPickupOrder.setWeightKg(new BigDecimal("0.50"));

        OrderSummaryDto confirmedDropoffOrder = new OrderSummaryDto();
        confirmedDropoffOrder.setId(602L);
        confirmedDropoffOrder.setOrderId("602");
        confirmedDropoffOrder.setTrackingNumber("SD-23581");
        confirmedDropoffOrder.setStatus("CONFIRMED");
        confirmedDropoffOrder.setPickupMethod("BRANCH_DROPOFF");
        confirmedDropoffOrder.setOriginBranchId(1L);
        confirmedDropoffOrder.setOriginBranchCode("CMB-1");
        confirmedDropoffOrder.setOriginBranchName("Colombo Hub 1");
        confirmedDropoffOrder.setDestinationBranchId(2L);
        confirmedDropoffOrder.setDestinationBranchCode("KDY-2");
        confirmedDropoffOrder.setDestinationBranchName("Kandy Hub 2");
        confirmedDropoffOrder.setSameBranch(false);
        confirmedDropoffOrder.setPickupAddress("Walk-in Branch 1");
        confirmedDropoffOrder.setDropoffAddress("25 Hill St, Kandy");
        confirmedDropoffOrder.setWeightKg(new BigDecimal("0.50"));

        List<PickupTask> savedTasks = new java.util.ArrayList<>();
        when(orderServiceClient.getOrdersForBranch(1L))
                .thenReturn(List.of(confirmedPickupOrder, confirmedDropoffOrder));
        when(pickupTaskRepository.existsByOrderId("601")).thenReturn(false);
        when(pickupTaskRepository.existsByOrderId("602")).thenReturn(false);
        when(pickupTaskRepository.save(any(PickupTask.class))).thenAnswer(inv -> {
            PickupTask t = inv.getArgument(0);
            t.setId((long) (savedTasks.size() + 100));
            savedTasks.add(t);
            return t;
        });
        when(pickupTaskRepository.findByOriginBranchIdOrderByCreatedAtDesc(1L))
                .thenAnswer(inv -> List.copyOf(savedTasks));

        List<PickupTaskDto> branchTasks = dispatchService.listPickupTasks(null, null, branch1Dispatcher);

        assertEquals(2, branchTasks.size());
        assertTrue(branchTasks.stream().anyMatch(t -> "SD-52711".equals(t.getTrackingNumber()) && "COURIER_PICKUP".equals(t.getPickupMethod())));
        assertTrue(branchTasks.stream().anyMatch(t -> "SD-23581".equals(t.getTrackingNumber()) && "BRANCH_DROPOFF".equals(t.getPickupMethod())));
    }
}


