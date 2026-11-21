package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.*;
import com.swiftdrop.dispatch.entity.enums.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class TransferRepositoryIntegrationTest {

    @Autowired private CourierProfileRepository courierRepository;
    @Autowired private TransferManifestRepository manifestRepository;
    @Autowired private TransferManifestParcelRepository manifestParcelRepository;
    @Autowired private ParcelCustodyRecordRepository custodyRepository;
    @Autowired private ReturnTaskRepository returnTaskRepository;
    @Autowired private DeliveryExceptionRepository exceptionRepository;
    @Autowired private CourierAssignmentRepository assignmentRepository;

    @Test
    void persistsTransfersCustodyRtsNullableJobExceptionsAndDetectsActiveConflicts() {
        CourierProfileEntity courier = new CourierProfileEntity();
        courier.setCourierCode("CR-IT-1");
        courier.setUserId("usr-it-1");
        courier.setName("Integration Rider");
        courier.setPhone("+94770001122");
        courier.setEmail("it.rider@swiftdrop.lk");
        courier.setVehicleType(VehicleType.VAN);
        courier.setVehiclePlate("WP-IT-10");
        courier.setBranchId(1L);
        courier.setBranchCode("CMB");
        courier.setBranchName("Colombo Hub");
        courier.setZone("Central");
        courier = courierRepository.save(courier);

        TransferManifest manifest = new TransferManifest();
        manifest.setManifestCode("TRF-IT-100");
        manifest.setOriginBranchId(1L);
        manifest.setOriginBranchCode("CMB");
        manifest.setOriginBranchName("Colombo Hub");
        manifest.setDestinationBranchId(2L);
        manifest.setDestinationBranchCode("KDY");
        manifest.setDestinationBranchName("Kandy Hub");
        manifest.setStatus(TransferManifestStatus.IN_TRANSIT);
        manifest.setAssignedCourier(courier);
        manifest.setAssignedCourierCode(courier.getCourierCode());
        manifest.setAssignedCourierName(courier.getName());
        manifest.setExpectedParcelCount(1);

        TransferManifestParcel parcel = new TransferManifestParcel();
        parcel.setOrderId("ORD-IT-1");
        parcel.setTrackingNumber("SD-IT-1");
        parcel.setParcelReference("SD-IT-1");
        parcel.setWeightKg(new BigDecimal("5.50"));
        parcel.setParcelCategory("Documents");
        parcel.setStatus(ManifestParcelStatus.DISPATCHED);
        manifest.addParcel(parcel);

        manifest = manifestRepository.saveAndFlush(manifest);

        boolean conflict = manifestParcelRepository.existsConflictingActiveParcel(
                "ORD-IT-1",
                "SD-IT-1",
                List.of(ManifestParcelStatus.MANIFESTED, ManifestParcelStatus.DISPATCHED),
                List.of(
                        TransferManifestStatus.DRAFT,
                        TransferManifestStatus.ASSIGNED,
                        TransferManifestStatus.IN_TRANSIT,
                        TransferManifestStatus.RECEIVED_WITH_DISCREPANCY
                )
        );
        assertThat(conflict).isTrue();
        assertThat(manifestParcelRepository.findBlockedOrderIds(
                List.of(ManifestParcelStatus.MANIFESTED, ManifestParcelStatus.DISPATCHED),
                List.of(TransferManifestStatus.IN_TRANSIT)
        )).containsExactly("ORD-IT-1");

        // Nullable delivery_job exception persists cleanly for transfer discrepancies
        DeliveryException transferEx = new DeliveryException();
        transferEx.setExceptionCode("EXC-IT-1");
        transferEx.setDeliveryJob(null);
        transferEx.setOrderId("ORD-IT-1");
        transferEx.setTrackingNumber("SD-IT-1");
        transferEx.setBranchId(2L);
        transferEx.setBranchCode("KDY");
        transferEx.setBranchName("Kandy Hub");
        transferEx.setTransferManifestId(manifest.getId());
        transferEx.setManifestCode(manifest.getManifestCode());
        transferEx.setParcelReference("SD-IT-1");
        transferEx.setExceptionType(ExceptionType.DAMAGED_PARCEL);
        transferEx.setStatus(ExceptionStatus.OPEN);
        transferEx.setDescription("Corner tear observed on arrival");
        transferEx.setEvidenceReference("pod-evidence://test-1.png");
        transferEx.setResponsibleUserId("disp-2");
        transferEx.setResponsibleUserName("kdy@swiftdrop.lk");
        transferEx.setResponsibleUserRole("DISPATCHER");
        transferEx.setReportedAt(LocalDateTime.now());
        transferEx = exceptionRepository.saveAndFlush(transferEx);

        assertThat(exceptionRepository.findByTransferManifestIdOrderByCreatedAtDesc(manifest.getId()))
                .hasSize(1);

        ReturnTask rts = new ReturnTask();
        rts.setReturnCode("RTS-IT-1");
        rts.setOrderId("ORD-IT-1");
        rts.setTrackingNumber("SD-IT-1");
        rts.setExceptionId(transferEx.getId());
        rts.setCurrentBranchId(2L);
        rts.setCurrentBranchCode("KDY");
        rts.setCurrentBranchName("Kandy Hub");
        rts.setOriginBranchId(1L);
        rts.setOriginBranchCode("CMB");
        rts.setOriginBranchName("Colombo Hub");
        rts.setReturnToName("Sender IT");
        rts.setReturnToPhone("+94771230000");
        rts.setReturnAddress("Colombo Hub");
        rts.setReason("Customer refused damaged package");
        rts.setStatus(ReturnTaskStatus.COURIER_ASSIGNED);
        rts.setAssignedCourier(courier);
        rts.setInitiatedAt(LocalDateTime.now());
        rts = returnTaskRepository.saveAndFlush(rts);

        assertThat(returnTaskRepository.existsByOrderIdAndStatusNot("ORD-IT-1", ReturnTaskStatus.CANCELLED)).isTrue();

        CourierAssignment transferAssignment = new CourierAssignment();
        transferAssignment.setAssignmentCode("ASN-IT-1");
        transferAssignment.setTaskType(AssignmentTaskType.TRANSFER);
        transferAssignment.setTransferManifest(manifest);
        transferAssignment.setOrderId(manifest.getManifestCode());
        transferAssignment.setTrackingNumber(manifest.getManifestCode());
        transferAssignment.setBranchId(1L);
        transferAssignment.setBranchCode("CMB");
        transferAssignment.setBranchName("Colombo Hub");
        transferAssignment.setCourier(courier);
        transferAssignment.setPriority(DeliveryPriority.NORMAL);
        transferAssignment.setStatus(AssignmentStatus.IN_TRANSIT);
        transferAssignment.setAssignedAt(LocalDateTime.now());
        assignmentRepository.saveAndFlush(transferAssignment);

        CourierAssignment returnAssignment = new CourierAssignment();
        returnAssignment.setAssignmentCode("ASN-IT-2");
        returnAssignment.setTaskType(AssignmentTaskType.RETURN);
        returnAssignment.setReturnTask(rts);
        returnAssignment.setOrderId("ORD-IT-1");
        returnAssignment.setTrackingNumber("SD-IT-1");
        returnAssignment.setBranchId(2L);
        returnAssignment.setBranchCode("KDY");
        returnAssignment.setBranchName("Kandy Hub");
        returnAssignment.setCourier(courier);
        returnAssignment.setPriority(DeliveryPriority.NORMAL);
        returnAssignment.setStatus(AssignmentStatus.ASSIGNED);
        returnAssignment.setAssignedAt(LocalDateTime.now());
        assignmentRepository.saveAndFlush(returnAssignment);

        assertThat(assignmentRepository.findByTransferManifestIdOrderByAssignedAtDesc(manifest.getId())).hasSize(1);
        assertThat(assignmentRepository.findByReturnTaskIdOrderByAssignedAtDesc(rts.getId())).hasSize(1);

        ParcelCustodyRecord custody = new ParcelCustodyRecord();
        custody.setCustodyCode("CST-IT-1");
        custody.setOrderId("ORD-IT-1");
        custody.setTrackingNumber("SD-IT-1");
        custody.setParcelReference("SD-IT-1");
        custody.setManifestId(manifest.getId());
        custody.setManifestReference(manifest.getManifestCode());
        custody.setEventType(CustodyEventType.MANIFEST_HANDOVER_DEPARTURE);
        custody.setResponsibleBranchId(1L);
        custody.setResponsibleBranchCode("CMB");
        custody.setResponsibleBranchName("Colombo Hub");
        custody.setResponsibleCourierId(courier.getId());
        custody.setResponsibleCourierCode(courier.getCourierCode());
        custody.setResponsibleCourierName(courier.getName());
        custody.setHandoverTimestamp(LocalDateTime.now());
        custodyRepository.saveAndFlush(custody);

        assertThat(custodyRepository.findByTrackingNumberIgnoreCaseOrderByHandoverTimestampAsc("SD-IT-1"))
                .hasSize(1);
    }
}

