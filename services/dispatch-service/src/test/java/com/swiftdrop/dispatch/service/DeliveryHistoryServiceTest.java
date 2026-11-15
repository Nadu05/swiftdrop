package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.DeliveryHistoryEnvelope;
import com.swiftdrop.dispatch.dto.DeliveryHistoryResponse;
import com.swiftdrop.dispatch.dto.DeliveryHistorySummaryMetrics;
import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.AssignmentHistory;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.DeliveryProof;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import com.swiftdrop.dispatch.entity.enums.VehicleType;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.AssignmentHistoryRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeliveryHistoryServiceTest {

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private AssignmentHistoryRepository assignmentHistoryRepository;

    @InjectMocks
    private DeliveryHistoryService deliveryHistoryService;

    private Courier courier;
    private Assignment deliveredAssignment;
    private Assignment failedAssignment;

    @BeforeEach
    void setUp() {
        courier = new Courier("CR-101", 101L, "Kamal Silva", "+94 77 123 4567",
                CourierStatus.AVAILABLE, VehicleType.MOTORCYCLE, "WP BDF-8942", 1L, 5);
        courier.setId(1L);

        deliveredAssignment = new Assignment("ASN-HIST-001", 98399L, courier, 1L, 1L,
                AssignmentStatus.DELIVERED, LocalDateTime.now().minusDays(1));
        deliveredAssignment.setId(10L);
        deliveredAssignment.setCompletedAt(LocalDateTime.now().minusHours(22));
        deliveredAssignment.setTrackingNumber("SD-94799");
        deliveredAssignment.setRecipientName("Nimali Jayasuriya");
        deliveredAssignment.setRecipientPhone("+94 71 889 4411");
        deliveredAssignment.setDeliveryAddress("45/2 Ward Place");
        deliveredAssignment.setRecipientCity("Colombo 07");
        deliveredAssignment.setMerchantName("Urban Fashion Boutique");
        deliveredAssignment.setPriority("HIGH");
        deliveredAssignment.setPackageCategory("Apparel");
        deliveredAssignment.setPackageWeight("1.2 kg");
        deliveredAssignment.setDeliveryAttempts(1);

        DeliveryProof proof = new DeliveryProof(deliveredAssignment, "Nimali Jayasuriya",
                ProofOfDeliveryType.SIGNATURE, "Direct handover at residence", "POD-SD-94799-SIG", null);
        deliveredAssignment.setDeliveryProof(proof);

        failedAssignment = new Assignment("ASN-HIST-002", 98398L, courier, 1L, 1L,
                AssignmentStatus.FAILED, LocalDateTime.now().minusDays(2));
        failedAssignment.setId(11L);
        failedAssignment.setCompletedAt(LocalDateTime.now().minusHours(40));
        failedAssignment.setTrackingNumber("SD-94798");
        failedAssignment.setRecipientName("Charith Senanayake");
        failedAssignment.setRecipientCity("Colombo South");
        failedAssignment.setFailureReason("Customer unreachable after 3 attempts");
        failedAssignment.setDeliveryNotes("Security gate locked");
        failedAssignment.setDeliveryAttempts(3);
        failedAssignment.setPriority("URGENT");
    }

    @Test
    @DisplayName("getDeliveryHistoryEnvelope returns populated deliveries and calculated summary metrics")
    void getDeliveryHistoryEnvelope_success() {
        when(assignmentRepository.findDeliveryHistory(anyCollection(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(deliveredAssignment, failedAssignment));

        DeliveryHistoryEnvelope envelope = deliveryHistoryService.getDeliveryHistoryEnvelope(
                null, null, null, null, null);

        assertThat(envelope).isNotNull();
        assertThat(envelope.getDeliveries()).hasSize(2);

        DeliveryHistorySummaryMetrics metrics = envelope.getMetrics();
        assertThat(metrics.getTotalDeliveries()).isEqualTo(2);
        assertThat(metrics.getSuccessfullyDelivered()).isEqualTo(1);
        assertThat(metrics.getFailedDeliveries()).isEqualTo(1);
        assertThat(metrics.getTotalDeliveryAttempts()).isEqualTo(4); // 1 + 3
    }

    @Test
    @DisplayName("getDeliveryHistoryRecords correctly maps proof of delivery details")
    void getDeliveryHistoryRecords_proofOfDeliveryMapping() {
        when(assignmentRepository.findDeliveryHistory(anyCollection(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(deliveredAssignment));

        List<DeliveryHistoryResponse> records = deliveryHistoryService.getDeliveryHistoryRecords(
                null, null, "DELIVERED", null, null);

        assertThat(records).hasSize(1);
        DeliveryHistoryResponse record = records.get(0);
        assertThat(record.getId()).isEqualTo("ASN-HIST-001");
        assertThat(record.getStatus()).isEqualTo("DELIVERED");
        assertThat(record.getPod()).isNotNull();
        assertThat(record.getPod().getRecipientName()).isEqualTo("Nimali Jayasuriya");
        assertThat(record.getPod().getPodType()).isEqualTo(ProofOfDeliveryType.SIGNATURE);
        assertThat(record.getPod().getPodReference()).isEqualTo("POD-SD-94799-SIG");
    }

    @Test
    @DisplayName("getDeliveryHistoryRecords correctly maps failure investigation details")
    void getDeliveryHistoryRecords_failureDetailsMapping() {
        when(assignmentRepository.findDeliveryHistory(anyCollection(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(failedAssignment));

        List<DeliveryHistoryResponse> records = deliveryHistoryService.getDeliveryHistoryRecords(
                null, null, "FAILED", null, null);

        assertThat(records).hasSize(1);
        DeliveryHistoryResponse record = records.get(0);
        assertThat(record.getStatus()).isEqualTo("FAILED");
        assertThat(record.getFailureDetails()).isNotNull();
        assertThat(record.getFailureDetails().getReason()).isEqualTo("Customer unreachable after 3 attempts");
        assertThat(record.getFailureDetails().getAttemptsCount()).isEqualTo(3);
        assertThat(record.getFailureDetails().getCourierNotes()).isEqualTo("Security gate locked");
    }

    @Test
    @DisplayName("getDeliveryHistoryById by primary ID returns record")
    void getDeliveryHistoryById_found() {
        when(assignmentRepository.findHistoryDetailsById(10L)).thenReturn(Optional.of(deliveredAssignment));

        DeliveryHistoryResponse response = deliveryHistoryService.getDeliveryHistoryById("10");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("ASN-HIST-001");
        assertThat(response.getOrderId()).isEqualTo("ORD-98399");
    }

    @Test
    @DisplayName("getDeliveryHistoryById by assignment code returns record")
    void getDeliveryHistoryById_byCode() {
        when(assignmentRepository.findHistoryDetailsByCode("ASN-HIST-001")).thenReturn(Optional.of(deliveredAssignment));

        DeliveryHistoryResponse response = deliveryHistoryService.getDeliveryHistoryById("ASN-HIST-001");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("ASN-HIST-001");
    }

    @Test
    @DisplayName("getDeliveryHistoryById unknown throws ResourceNotFoundException")
    void getDeliveryHistoryById_notFound() {
        when(assignmentRepository.findHistoryDetailsById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deliveryHistoryService.getDeliveryHistoryById("999"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("calculateMetrics correctly calculates totals from list")
    void calculateMetrics_success() {
        DeliveryHistorySummaryMetrics metrics = deliveryHistoryService.calculateMetrics(Collections.emptyList());
        assertThat(metrics.getTotalDeliveries()).isZero();
        assertThat(metrics.getSuccessfullyDelivered()).isZero();
        assertThat(metrics.getFailedDeliveries()).isZero();
        assertThat(metrics.getTotalDeliveryAttempts()).isZero();
    }
}

