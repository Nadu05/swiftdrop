package com.swiftdrop.notification.service;

import com.swiftdrop.notification.dto.NotificationDto;
import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.entity.NotificationOrderContact;
import com.swiftdrop.notification.entity.NotificationProcessedEvent;
import com.swiftdrop.notification.exception.NotificationDeliveryException;
import com.swiftdrop.notification.repository.NotificationOrderContactRepository;
import com.swiftdrop.notification.repository.NotificationProcessedEventRepository;
import com.swiftdrop.notification.repository.NotificationRepository;
import com.swiftdrop.notification.security.NotificationUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationOrderContactRepository contactRepository;

    @Mock
    private NotificationProcessedEventRepository processedEventRepository;

    @Mock
    private NotificationSenderPort senderPort;

    @Mock
    private NotificationAuditHelper auditHelper;

    private NotificationService notificationService;
    private NotificationOrderContact cachedContact;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository,
                contactRepository,
                processedEventRepository,
                senderPort,
                auditHelper
        );

        cachedContact = new NotificationOrderContact();
        cachedContact.setOrderId("101");
        cachedContact.setTrackingNumber("SD-10101");
        cachedContact.setCustomerUserId("usr-cust-101");
        cachedContact.setCustomerEmail("customer@swiftdrop.lk");
        cachedContact.setOriginBranchName("Colombo Central");
        cachedContact.setDestinationBranchName("Kandy Hub");

        lenient().when(notificationRepository.findByNotificationCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        lenient().when(notificationRepository.save(any(NotificationEntity.class))).thenAnswer(inv -> {
            NotificationEntity e = inv.getArgument(0);
            if (e.getId() == null) e.setId(1L);
            return e;
        });
    }

    @Test
    void processDomainEvent_CoversAllLifecycleOrderDispatchAndMerchantEvents() {
        when(processedEventRepository.existsByEventIdAndConsumerGroup(anyString(), anyString())).thenReturn(false);
        when(contactRepository.findByTrackingNumberIgnoreCase("SD-10101")).thenReturn(Optional.of(cachedContact));
        when(contactRepository.save(any(NotificationOrderContact.class))).thenAnswer(inv -> inv.getArgument(0));

        List<Map<String, Object>> events = List.of(
                Map.of("eventId", "e1", "eventType", "OrderConfirmed", "orderId", "101", "trackingNumber", "SD-10101",
                        "customerUserId", "usr-cust-101", "customerEmail", "customer@swiftdrop.lk",
                        "originBranchName", "Colombo Central", "destinationBranchName", "Kandy Hub", "pickupMethod", "COURIER_PICKUP"),
                Map.of("eventId", "e2", "eventType", "CourierAssigned", "assignmentType", "PICKUP", "trackingNumber", "SD-10101", "courierName", "Ruwan"),
                Map.of("eventId", "e3", "eventType", "ParcelPickedUp", "trackingNumber", "SD-10101", "courierName", "Ruwan"),
                Map.of("eventId", "e4", "eventType", "ParcelReceivedAtBranch", "trackingNumber", "SD-10101", "branchName", "Colombo Central"),
                Map.of("eventId", "e5", "eventType", "TransferManifestDispatched", "manifestCode", "TMF-01", "originBranchName", "Colombo Central",
                        "destinationBranchName", "Kandy Hub", "trackingNumbers", List.of("SD-10101")),
                Map.of("eventId", "e6", "eventType", "ParcelReceivedAtDestinationBranch", "trackingNumber", "SD-10101",
                        "destinationBranchName", "Kandy Hub", "manifestCode", "TMF-01"),
                Map.of("eventId", "e7", "eventType", "OutForDelivery", "trackingNumber", "SD-10101", "courierName", "Kasun"),
                Map.of("eventId", "e8", "eventType", "DeliveryAttemptFailed", "trackingNumber", "SD-10101", "attemptNumber", 1, "reason", "Customer unavailable"),
                Map.of("eventId", "e9", "eventType", "DeliveryCompleted", "trackingNumber", "SD-10101", "recipientName", "Amaya", "proofType", "SIGNATURE"),
                Map.of("eventId", "e10", "eventType", "ReturnToSenderInitiated", "trackingNumber", "SD-10101", "returnCode", "RTS-10", "reason", "Max attempts exceeded"),
                Map.of("eventId", "e11", "eventType", "MerchantApplicationApproved", "applicationCode", "APP-2026-0812",
                        "businessName", "Ceylon Organic", "contactEmail", "aruni@ceylon.lk", "applicantUserId", "usr-m-1")
        );

        List<String> producedTypes = new ArrayList<>();
        for (Map<String, Object> evt : events) {
            List<NotificationDto> result = notificationService.processDomainEvent(evt);
            result.forEach(dto -> producedTypes.add(dto.notificationType()));
        }

        assertThat(producedTypes).containsExactly(
                "ORDER_CONFIRMED",
                "PICKUP_ASSIGNED",
                "PARCEL_PICKED_UP",
                "PARCEL_RECEIVED_AT_BRANCH",
                "IN_TRANSIT_UPDATE",
                "ARRIVED_DESTINATION_BRANCH",
                "OUT_FOR_DELIVERY",
                "DELIVERY_FAILED",
                "DELIVERY_COMPLETED",
                "RTS_INITIATED",
                "MERCHANT_APPLICATION_APPROVED"
        );
        verify(senderPort, times(events.size())).send(any(NotificationEntity.class));
        verify(processedEventRepository, times(events.size())).save(any(NotificationProcessedEvent.class));
    }

    @Test
    void processDomainEvent_DeduplicatesDuplicateEventId() {
        Map<String, Object> event = Map.of(
                "eventId", "dup-evt-01",
                "eventType", "DeliveryCompleted",
                "trackingNumber", "SD-10101",
                "recipientName", "Amaya"
        );

        when(processedEventRepository.existsByEventIdAndConsumerGroup("dup-evt-01", NotificationService.CONSUMER_GROUP))
                .thenReturn(false)
                .thenReturn(true);
        when(contactRepository.findByTrackingNumberIgnoreCase("SD-10101")).thenReturn(Optional.of(cachedContact));

        List<NotificationDto> first = notificationService.processDomainEvent(event);
        List<NotificationDto> second = notificationService.processDomainEvent(event);

        assertThat(first).hasSize(1);
        assertThat(second).isEmpty();
        verify(senderPort, times(1)).send(any(NotificationEntity.class));
    }

    @Test
    void processDomainEvent_WhenSenderFails_RecordsFailedStatusAndRethrowsForRetryAndDlq() {
        Map<String, Object> event = Map.of(
                "eventId", "fail-evt-01",
                "eventType", "DeliveryAttemptFailed",
                "correlationId", "corr-fail-7",
                "trackingNumber", "SD-10101",
                "attemptNumber", 2,
                "reason", "Address unreachable"
        );

        when(processedEventRepository.existsByEventIdAndConsumerGroup("fail-evt-01", NotificationService.CONSUMER_GROUP))
                .thenReturn(false);
        when(contactRepository.findByTrackingNumberIgnoreCase("SD-10101")).thenReturn(Optional.of(cachedContact));
        doThrow(new NotificationDeliveryException("SMTP gateway timeout")).when(senderPort).send(any());

        assertThatThrownBy(() -> notificationService.processDomainEvent(event))
                .isInstanceOf(NotificationDeliveryException.class)
                .hasMessageContaining("SMTP gateway timeout");

        verify(auditHelper).recordFailureInNewTx(argThat(n ->
                NotificationEntity.STATUS_FAILED.equals(n.getStatus())
                        && "corr-fail-7".equals(n.getCorrelationId())
        ), eq("SMTP gateway timeout"));
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void retryFailedNotifications_AsAdmin_ResendsAndMarksSent() {
        NotificationEntity failed = new NotificationEntity();
        failed.setId(9L);
        failed.setNotificationCode("NTF-990001");
        failed.setEventId("fail-evt-01");
        failed.setEventType("DeliveryCompleted");
        failed.setNotificationType("DELIVERY_COMPLETED");
        failed.setStatus(NotificationEntity.STATUS_FAILED);
        failed.setAttemptCount(1);
        failed.setTitle("Parcel delivered");
        failed.setMessage("Delivered");

        when(notificationRepository.findByStatusOrderByCreatedAtAsc(NotificationEntity.STATUS_FAILED))
                .thenReturn(List.of(failed));

        NotificationUserPrincipal admin = new NotificationUserPrincipal("admin-1", "admin@swiftdrop.lk", List.of("ADMIN"));
        List<NotificationDto> retried = notificationService.retryFailedNotifications(admin);

        assertThat(retried).hasSize(1);
        assertThat(retried.get(0).status()).isEqualTo(NotificationEntity.STATUS_SENT);
        assertThat(retried.get(0).attemptCount()).isEqualTo(2);
    }
}

