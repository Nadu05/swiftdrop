package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.courier.CourierJobResponse;
import com.swiftdrop.dispatch.dto.courier.CourierProfileResponse;
import com.swiftdrop.dispatch.dto.courier.FailedDeliveryRequest;
import com.swiftdrop.dispatch.dto.courier.ProofOfDeliveryRequest;
import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.CourierDelivery;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import com.swiftdrop.dispatch.entity.enums.VehicleType;
import com.swiftdrop.dispatch.exception.CourierPortalException;
import com.swiftdrop.dispatch.repository.CourierAssignmentRepository;
import com.swiftdrop.dispatch.repository.CourierDeliveryRepository;
import com.swiftdrop.dispatch.repository.CourierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourierPortalServiceTest {

    private static final Long COURIER_ID = 103L;
    private static final Long ASSIGNMENT_ID = 7101L;
    private static final Long ORDER_ID = 42L;
    private static final Instant NOW = Instant.parse("2026-11-14T08:00:00Z");

    @Mock private CourierRepository courierRepository;
    @Mock private CourierAssignmentRepository assignmentRepository;
    @Mock private CourierDeliveryRepository deliveryRepository;
    @Mock private CourierService courierService;

    private CourierPortalService service;
    private Courier courier;

    @BeforeEach
    void setUp() {
        service = new CourierPortalService(courierRepository, assignmentRepository, deliveryRepository,
                courierService, Clock.fixed(NOW, ZoneOffset.UTC));
        courier = new Courier("CR-103", null, "Kasun Dias", "+94 72 333 8899", CourierStatus.AVAILABLE,
                VehicleType.MOTORCYCLE, "WP BHK-4471", 1L, 8);
        courier.setId(COURIER_ID);
    }

    private Assignment assignment(AssignmentStatus status) {
        Assignment a = new Assignment("ASN-7101", ORDER_ID, courier, 1L, null, status, LocalDateTime.of(2026, 11, 14, 7, 0));
        a.setId(ASSIGNMENT_ID);
        return a;
    }

    private void givenOwnJob(Assignment a) {
        when(assignmentRepository.findOwnJob(ASSIGNMENT_ID, COURIER_ID)).thenReturn(Optional.of(a));
    }

    private CourierDelivery details(Assignment a) {
        CourierDelivery d = new CourierDelivery(a);
        d.setTrackingNumber("SD-261114-ABC");
        d.setRecipientName("Amali Perera");
        return d;
    }

    @Nested
    @DisplayName("profile and availability")
    class ProfileAndAvailability {

        @Test
        @DisplayName("profile includes the active workload")
        void profile() {
            when(courierRepository.findById(COURIER_ID)).thenReturn(Optional.of(courier));
            when(courierService.calculateActiveWorkload(COURIER_ID)).thenReturn(2);

            CourierProfileResponse profile = service.getProfile(COURIER_ID);

            assertThat(profile.courierCode()).isEqualTo("CR-103");
            assertThat(profile.activeDeliveries()).isEqualTo(2);
        }

        @Test
        @DisplayName("unknown courier is 404")
        void unknownCourier() {
            when(courierRepository.findById(COURIER_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getProfile(COURIER_ID))
                    .isInstanceOfSatisfying(CourierPortalException.class,
                            ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        }

        @Test
        @DisplayName("going offline sets OFFLINE")
        void goOffline() {
            when(courierRepository.findById(COURIER_ID)).thenReturn(Optional.of(courier));
            when(courierRepository.save(courier)).thenReturn(courier);

            assertThat(service.setAvailability(COURIER_ID, false).status()).isEqualTo(CourierStatus.OFFLINE);
        }

        @Test
        @DisplayName("going online from OFFLINE sets AVAILABLE")
        void goOnline() {
            courier.setStatus(CourierStatus.OFFLINE);
            when(courierRepository.findById(COURIER_ID)).thenReturn(Optional.of(courier));
            when(courierRepository.save(courier)).thenReturn(courier);

            assertThat(service.setAvailability(COURIER_ID, true).status()).isEqualTo(CourierStatus.AVAILABLE);
        }

        @Test
        @DisplayName("going online while BUSY changes nothing")
        void onlineWhileBusy() {
            courier.setStatus(CourierStatus.BUSY);
            when(courierRepository.findById(COURIER_ID)).thenReturn(Optional.of(courier));

            assertThat(service.setAvailability(COURIER_ID, true).status()).isEqualTo(CourierStatus.BUSY);
            verify(courierRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("job list")
    class Jobs {

        @Test
        @DisplayName("jobs are joined with their details; missing details give a bare job")
        void listJobs() {
            Assignment withDetails = assignment(AssignmentStatus.ASSIGNED);
            Assignment bare = new Assignment("ASN-7102", 43L, courier, 1L, null, AssignmentStatus.ACCEPTED, LocalDateTime.now());
            bare.setId(7102L);
            when(courierRepository.findById(COURIER_ID)).thenReturn(Optional.of(courier));
            when(assignmentRepository.findCourierJobs(eq(COURIER_ID), eq(CourierPortalService.VISIBLE_STATUSES), any()))
                    .thenReturn(List.of(withDetails, bare));
            when(deliveryRepository.findByAssignmentIdIn(List.of(ASSIGNMENT_ID, 7102L)))
                    .thenReturn(List.of(details(withDetails)));

            List<CourierJobResponse> jobs = service.listJobs(COURIER_ID, null);

            assertThat(jobs).hasSize(2);
            assertThat(jobs.get(0).trackingNumber()).isEqualTo("SD-261114-ABC");
            assertThat(jobs.get(1).trackingNumber()).isNull();
            assertThat(jobs.get(1).recipient()).isNull();
        }

        @Test
        @DisplayName("limit is clamped to 200")
        void limitClamped() {
            when(courierRepository.findById(COURIER_ID)).thenReturn(Optional.of(courier));
            when(assignmentRepository.findCourierJobs(any(), any(), any())).thenReturn(List.of());

            service.listJobs(COURIER_ID, 5000);

            verify(assignmentRepository).findCourierJobs(eq(COURIER_ID), any(),
                    argThat(p -> p.getPageSize() == CourierPortalService.MAX_LIMIT));
        }
    }

    @Nested
    @DisplayName("proof of delivery")
    class ProofOfDelivery {

        private final ProofOfDeliveryRequest otp = new ProofOfDeliveryRequest(ProofOfDeliveryType.OTP, " 4417 ", " Amali ");

        @Test
        @DisplayName("is saved for a job in transit and does not change the status")
        void saved() {
            Assignment a = assignment(AssignmentStatus.IN_TRANSIT);
            givenOwnJob(a);
            when(deliveryRepository.findByAssignmentId(ASSIGNMENT_ID)).thenReturn(Optional.of(details(a)));

            CourierJobResponse job = service.recordProofOfDelivery(COURIER_ID, ASSIGNMENT_ID, otp);

            assertThat(job.status()).isEqualTo(AssignmentStatus.IN_TRANSIT);
            assertThat(job.proofOfDelivery().reference()).isEqualTo("4417");
            assertThat(job.proofOfDelivery().receivedBy()).isEqualTo("Amali");
            assertThat(job.completedAt()).isEqualTo(NOW);
            verify(deliveryRepository).save(any(CourierDelivery.class));
            verify(assignmentRepository, never()).save(any());
        }

        @Test
        @DisplayName("creates the details row when none exists")
        void createsDetails() {
            givenOwnJob(assignment(AssignmentStatus.IN_TRANSIT));
            when(deliveryRepository.findByAssignmentId(ASSIGNMENT_ID)).thenReturn(Optional.empty());

            assertThat(service.recordProofOfDelivery(COURIER_ID, ASSIGNMENT_ID, otp).proofOfDelivery()).isNotNull();
        }

        @Test
        @DisplayName("is refused before pickup (409)")
        void beforePickup() {
            givenOwnJob(assignment(AssignmentStatus.ACCEPTED));

            assertThatThrownBy(() -> service.recordProofOfDelivery(COURIER_ID, ASSIGNMENT_ID, otp))
                    .isInstanceOfSatisfying(CourierPortalException.class,
                            ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
            verify(deliveryRepository, never()).save(any());
        }

        @Test
        @DisplayName("an OTP that is not 4-6 digits is 400")
        void badOtp() {
            givenOwnJob(assignment(AssignmentStatus.IN_TRANSIT));

            assertThatThrownBy(() -> service.recordProofOfDelivery(COURIER_ID, ASSIGNMENT_ID,
                    new ProofOfDeliveryRequest(ProofOfDeliveryType.OTP, "12ab", "Amali")))
                    .isInstanceOfSatisfying(CourierPortalException.class,
                            ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        }

        @Test
        @DisplayName("another courier's job is 404")
        void notOwnJob() {
            when(assignmentRepository.findOwnJob(ASSIGNMENT_ID, COURIER_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.recordProofOfDelivery(COURIER_ID, ASSIGNMENT_ID, otp))
                    .isInstanceOfSatisfying(CourierPortalException.class,
                            ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        }
    }

    @Nested
    @DisplayName("failure details")
    class FailureDetails {

        private final FailedDeliveryRequest request = new FailedDeliveryRequest(" Recipient not available ", " Called twice ");

        @Test
        @DisplayName("are saved for a job in transit")
        void saved() {
            Assignment a = assignment(AssignmentStatus.IN_TRANSIT);
            givenOwnJob(a);
            when(deliveryRepository.findByAssignmentId(ASSIGNMENT_ID)).thenReturn(Optional.of(details(a)));

            CourierJobResponse job = service.recordFailureDetails(COURIER_ID, ASSIGNMENT_ID, request);

            assertThat(job.failure().reason()).isEqualTo("Recipient not available");
            assertThat(job.failure().notes()).isEqualTo("Called twice");
            assertThat(job.status()).isEqualTo(AssignmentStatus.IN_TRANSIT);
        }

        @Test
        @DisplayName("are refused when the job is not in transit (409)")
        void notInTransit() {
            givenOwnJob(assignment(AssignmentStatus.DELIVERED));

            assertThatThrownBy(() -> service.recordFailureDetails(COURIER_ID, ASSIGNMENT_ID, request))
                    .isInstanceOfSatisfying(CourierPortalException.class,
                            ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        }
    }
}
