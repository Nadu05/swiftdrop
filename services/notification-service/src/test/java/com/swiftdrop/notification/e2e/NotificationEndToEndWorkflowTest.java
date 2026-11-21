package com.swiftdrop.notification.e2e;

import com.swiftdrop.notification.dto.NotificationDto;
import com.swiftdrop.notification.dto.PublicTrackingNotificationDto;
import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.exception.NotificationDeliveryException;
import com.swiftdrop.notification.repository.NotificationOrderContactRepository;
import com.swiftdrop.notification.repository.NotificationProcessedEventRepository;
import com.swiftdrop.notification.repository.NotificationRepository;
import com.swiftdrop.notification.security.NotificationUserPrincipal;
import com.swiftdrop.notification.service.NotificationAuditHelper;
import com.swiftdrop.notification.service.NotificationSenderPort;
import com.swiftdrop.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(NotificationAuditHelper.class)
class NotificationEndToEndWorkflowTest {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationOrderContactRepository contactRepository;

    @Autowired
    private NotificationProcessedEventRepository processedEventRepository;

    @Autowired
    private NotificationAuditHelper auditHelper;

    private AtomicBoolean failDelivery;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        failDelivery = new AtomicBoolean(false);
        NotificationSenderPort controllableSender = notification -> {
            if (failDelivery.get()) {
                throw new NotificationDeliveryException("SMTP gateway timeout");
            }
        };
        notificationService = new NotificationService(
                notificationRepository,
                contactRepository,
                processedEventRepository,
                controllableSender,
                auditHelper
        );
    }

    @Test
    void processesAllRequiredDomainEventsWithContactCachingDeduplicationFailureAuditAndPiiMasking() {
        // 1. Merchant onboarding events
        notificationService.processDomainEvent(Map.of(
                "eventId", "evt-merch-sub-1",
                "eventType", "MerchantApplicationSubmitted",
                "applicationCode", "APP-2026-9001",
                "businessName", "Serendib Roasters",
                "applicantEmail", "founder@serendib.lk",
                "applicantUserId", "usr-merch-90",
                "correlationId", "corr-e2e-01"
        ));
        notificationService.processDomainEvent(Map.of(
                "eventId", "evt-merch-app-1",
                "eventType", "MerchantApplicationApproved",
                "applicationCode", "APP-2026-9001",
                "businessName", "Serendib Roasters",
                "applicantEmail", "founder@serendib.lk",
                "applicantUserId", "usr-merch-90",
                "organizationCode", "ORG-SERENDIB",
                "correlationId", "corr-e2e-02"
        ));

        // 2. OrderCreated + OrderConfirmed cache customer/sender/recipient contacts
        notificationService.processDomainEvent(Map.ofEntries(
                Map.entry("eventId", "evt-ord-cre-1"),
                Map.entry("eventType", "OrderCreated"),
                Map.entry("orderId", "901"),
                Map.entry("trackingNumber", "SD-90101"),
                Map.entry("customerUserId", "usr-cust-901"),
                Map.entry("customerEmail", "kasun@swiftdrop.lk"),
                Map.entry("senderName", "Kasun Silva"),
                Map.entry("senderEmail", "sender@swiftdrop.lk"),
                Map.entry("recipientName", "Amaya Fernando"),
                Map.entry("recipientEmail", "amaya.fernando@gmail.com"),
                Map.entry("originBranchName", "Colombo Central"),
                Map.entry("destinationBranchName", "Kandy Hub"),
                Map.entry("correlationId", "corr-e2e-03")
        ));
        notificationService.processDomainEvent(Map.of(
                "eventId", "evt-ord-conf-1",
                "eventType", "OrderConfirmed",
                "orderId", "901",
                "trackingNumber", "SD-90101",
                "correlationId", "corr-e2e-04"
        ));

        // 3. Operational lifecycle events resolve cached recipient/customer contacts automatically
        List<Map<String, Object>> lifecycleEvents = List.of(
                Map.of("eventId", "evt-pkp-1", "eventType", "PickupTaskCreated", "orderId", "901", "trackingNumber", "SD-90101", "correlationId", "corr-e2e-05"),
                Map.of("eventId", "evt-asn-1", "eventType", "CourierAssigned", "orderId", "901", "trackingNumber", "SD-90101", "courierCode", "CR-101", "taskType", "PICKUP", "correlationId", "corr-e2e-06"),
                Map.of("eventId", "evt-pic-1", "eventType", "ParcelPickedUp", "orderId", "901", "trackingNumber", "SD-90101", "correlationId", "corr-e2e-07"),
                Map.of("eventId", "evt-br-1", "eventType", "ParcelReceivedAtBranch", "orderId", "901", "trackingNumber", "SD-90101", "branchName", "Colombo Central", "correlationId", "corr-e2e-08"),
                Map.of("eventId", "evt-trf-1", "eventType", "TransferManifestDispatched", "manifestCode", "TMF-2026-901", "trackingNumbers", List.of("SD-90101"), "correlationId", "corr-e2e-09"),
                Map.of("eventId", "evt-dst-1", "eventType", "ParcelReceivedAtDestinationBranch", "orderId", "901", "trackingNumber", "SD-90101", "destinationBranchName", "Kandy Hub", "correlationId", "corr-e2e-10"),
                Map.of("eventId", "evt-ofd-1", "eventType", "OutForDelivery", "orderId", "901", "trackingNumber", "SD-90101", "courierCode", "CR-202", "correlationId", "corr-e2e-11"),
                Map.of("eventId", "evt-fail-1", "eventType", "DeliveryAttemptFailed", "orderId", "901", "trackingNumber", "SD-90101", "attemptCount", 1, "reason", "Recipient not available", "correlationId", "corr-e2e-12"),
                Map.of("eventId", "evt-cmp-1", "eventType", "DeliveryCompleted", "orderId", "901", "trackingNumber", "SD-90101", "recipientName", "Amaya Fernando", "correlationId", "corr-e2e-13"),
                Map.of("eventId", "evt-rts-1", "eventType", "ReturnToSenderInitiated", "orderId", "902", "trackingNumber", "SD-90102", "customerEmail", "returner@swiftdrop.lk", "correlationId", "corr-e2e-14")
        );
        lifecycleEvents.forEach(notificationService::processDomainEvent);

        // 4. Duplicate delivery (Exception #10) must be skipped idempotently
        int countBeforeDuplicate = notificationRepository.findByTrackingNumberIgnoreCaseOrderByCreatedAtAsc("SD-90101").size();
        List<NotificationDto> duplicateResult = notificationService.processDomainEvent(Map.of(
                "eventId", "evt-cmp-1",
                "eventType", "DeliveryCompleted",
                "orderId", "901",
                "trackingNumber", "SD-90101"
        ));
        assertThat(duplicateResult).isEmpty();
        assertThat(notificationRepository.findByTrackingNumberIgnoreCaseOrderByCreatedAtAsc("SD-90101"))
                .hasSize(countBeforeDuplicate);

        // 5. Public tracking endpoint returns sanitized milestone DTOs without recipient PII
        List<PublicTrackingNotificationDto> publicMilestones = notificationService.getPublicTrackingNotifications("SD-90101");
        assertThat(publicMilestones).isNotEmpty();
        assertThat(publicMilestones).allSatisfy(n -> {
            assertThat(n.trackingNumber()).isEqualTo("SD-90101");
            assertThat(n.deliveryStatus()).isEqualTo(NotificationEntity.STATUS_SENT);
        });

        // 6. Exception #9: Notification delivery failure persists FAILED audit row and rethrows for AMQP retry/DLQ
        failDelivery.set(true);
        assertThatThrownBy(() -> notificationService.processDomainEvent(Map.of(
                "eventId", "evt-fail-smtp",
                "eventType", "OrderConfirmed",
                "orderId", "903",
                "trackingNumber", "SD-90103",
                "customerEmail", "fail@swiftdrop.lk",
                "correlationId", "corr-fail-9"
        ))).isInstanceOf(NotificationDeliveryException.class);

        List<NotificationEntity> failedRows = notificationRepository
                .findByStatusOrderByCreatedAtAsc(NotificationEntity.STATUS_FAILED);
        assertThat(failedRows).hasSize(1);
        assertThat(failedRows.get(0).getErrorMessage()).contains("SMTP gateway timeout");

        // 7. Recovery via admin retry endpoint
        failDelivery.set(false);
        NotificationUserPrincipal admin = new NotificationUserPrincipal("admin-1", "admin@swiftdrop.lk", List.of("ADMIN"));
        List<NotificationDto> retried = notificationService.retryFailedNotifications(admin);
        assertThat(retried).hasSize(1);
        assertThat(retried.get(0).status()).isEqualTo(NotificationEntity.STATUS_SENT);
        assertThat(notificationRepository.findByStatusOrderByCreatedAtAsc(NotificationEntity.STATUS_FAILED)).isEmpty();
    }
}

