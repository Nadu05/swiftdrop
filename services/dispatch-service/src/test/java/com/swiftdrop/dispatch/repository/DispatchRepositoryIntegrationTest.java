package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:dispatch_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
})
class DispatchRepositoryIntegrationTest {

    @Autowired
    private CourierProfileRepository courierRepository;
    @Autowired
    private DeliveryJobRepository deliveryJobRepository;
    @Autowired
    private CourierAssignmentRepository assignmentRepository;
    @Autowired
    private DeliveryExceptionRepository exceptionRepository;

    @Test
    void persistsCourierAssignmentWorkloadAttemptsPodAndExceptionRelationships() {
        CourierProfileEntity courier = new CourierProfileEntity();
        courier.setCourierCode("CR-901");
        courier.setUserId("courier-901");
        courier.setName("Test Courier");
        courier.setPhone("+94771234567");
        courier.setEmail("cr901@swiftdrop.lk");
        courier.setVehicleType(VehicleType.MOTORCYCLE);
        courier.setVehiclePlate("WP BDF-9001");
        courier.setBranchId(1L);
        courier.setBranchCode("CMB-CENTRAL");
        courier.setBranchName("Colombo Central Hub");
        courier.setZone("Zone A");
        courier.setAvailabilityStatus(CourierAvailabilityStatus.AVAILABLE);
        courier.setMaxCapacity(8);
        CourierProfileEntity savedCourier = courierRepository.save(courier);

        DeliveryJob job = new DeliveryJob();
        job.setJobCode("DLV-90001");
        job.setOrderId("9001");
        job.setTrackingNumber("SD-90001");
        job.setStatus(DeliveryJobStatus.ASSIGNED);
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
        job.setSenderName("Sender");
        job.setSenderPhone("+94770000000");
        job.setPickupAddress("10 Duplication Rd");
        job.setRecipientName("Recipient");
        job.setRecipientPhone("+94771111111");
        job.setDeliveryAddress("42 Galle Rd");
        job.setParcelCategory("Electronics");
        job.setWeightKg(new BigDecimal("2.50"));

        DeliveryAttempt attempt = new DeliveryAttempt();
        attempt.setOrderId("9001");
        attempt.setTrackingNumber("SD-90001");
        attempt.setAttemptNumber(1);
        attempt.setOutcome(AttemptOutcome.SUCCESS);
        attempt.setCourierId(savedCourier.getId());
        attempt.setCourierCode("CR-901");
        attempt.setCourierName("Test Courier");
        job.addAttempt(attempt);

        ProofOfDelivery pod = new ProofOfDelivery();
        pod.setOrderId("9001");
        pod.setTrackingNumber("SD-90001");
        pod.setParcelReference("PRC-SD-90001");
        pod.setRecipientName("Recipient");
        pod.setProofType(ProofOfDeliveryType.SIGNATURE);
        pod.setSignatureReference("pod-storage://sig/SD-90001/sig-1");
        pod.setCourierId(savedCourier.getId());
        pod.setCourierCode("CR-901");
        pod.setCourierName("Test Courier");
        pod.setDeliveredAt(LocalDateTime.now());
        job.attachProofOfDelivery(pod);

        DeliveryJob savedJob = deliveryJobRepository.save(job);

        CourierAssignment assignment = new CourierAssignment();
        assignment.setAssignmentCode("ASN-9001");
        assignment.setTaskType(AssignmentTaskType.DELIVERY);
        assignment.setDeliveryJob(savedJob);
        assignment.setOrderId("9001");
        assignment.setTrackingNumber("SD-90001");
        assignment.setBranchId(1L);
        assignment.setBranchCode("CMB-CENTRAL");
        assignment.setBranchName("Colombo Central Hub");
        assignment.setCourier(savedCourier);
        assignment.setStatus(AssignmentStatus.ASSIGNED);

        AssignmentHistoryRecord hist = new AssignmentHistoryRecord();
        hist.setToCourierId(savedCourier.getId());
        hist.setToCourierName(savedCourier.getName());
        hist.setReason("Initial allocation");
        hist.setAssignedBy("Dispatcher");
        assignment.addHistoryEntry(hist);

        assignmentRepository.save(assignment);

        long activeWorkload = assignmentRepository.countByCourierIdAndStatusIn(
                savedCourier.getId(),
                EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_TRANSIT)
        );
        assertEquals(1L, activeWorkload);

        DeliveryJob reloaded = deliveryJobRepository.findByTrackingNumberIgnoreCase("SD-90001").orElseThrow();
        assertEquals(1, reloaded.getAttempts().size());
        assertNotNull(reloaded.getProofOfDelivery());
        assertEquals("pod-storage://sig/SD-90001/sig-1", reloaded.getProofOfDelivery().getSignatureReference());

        DeliveryException exception = new DeliveryException();
        exception.setExceptionCode("EXC-9001");
        exception.setDeliveryJob(savedJob);
        exception.setOrderId("9001");
        exception.setTrackingNumber("SD-90001");
        exception.setBranchId(1L);
        exception.setBranchCode("CMB-CENTRAL");
        exception.setBranchName("Colombo Central Hub");
        exception.setExceptionType(ExceptionType.MAX_ATTEMPTS_EXCEEDED);
        exception.setStatus(ExceptionStatus.PENDING_DECISION);
        exception.setFailedAttemptCount(3);
        exceptionRepository.save(exception);

        List<DeliveryException> pending = exceptionRepository.findByBranchIdAndStatusOrderByCreatedAtDesc(
                1L, ExceptionStatus.PENDING_DECISION
        );
        assertEquals(1, pending.size());
        assertEquals("EXC-9001", pending.get(0).getExceptionCode());
    }
}
