package com.swiftdrop.notification.repository;

import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.entity.NotificationOrderContact;
import com.swiftdrop.notification.entity.NotificationProcessedEvent;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class NotificationRepositoryIntegrationTest {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationOrderContactRepository contactRepository;

    @Autowired
    private NotificationProcessedEventRepository processedEventRepository;

    @Test
    void persistNotificationContactAndProcessedInbox_WorksEndToEnd() {
        NotificationOrderContact contact = new NotificationOrderContact();
        contact.setOrderId("202");
        contact.setTrackingNumber("SD-20202");
        contact.setCustomerUserId("usr-202");
        contact.setCustomerEmail("customer202@swiftdrop.lk");
        contact.setOriginBranchName("Colombo Central");
        contact.setDestinationBranchName("Galle South");
        contactRepository.save(contact);

        NotificationEntity entity = new NotificationEntity();
        entity.setNotificationCode("NTF-202020");
        entity.setEventId("evt-repo-202");
        entity.setEventType("OrderConfirmed");
        entity.setNotificationType("ORDER_CONFIRMED");
        entity.setChannel("EMAIL");
        entity.setRecipientUserId("usr-202");
        entity.setRecipientEmail("customer202@swiftdrop.lk");
        entity.setTrackingNumber("SD-20202");
        entity.setOrderId("202");
        entity.setTitle("Order SD-20202 confirmed");
        entity.setMessage("Confirmed for pickup");
        entity.setCorrelationId("corr-repo-202");
        entity.setStatus(NotificationEntity.STATUS_SENT);
        entity.setAttemptCount(1);
        entity.setSentAt(LocalDateTime.now());
        notificationRepository.save(entity);

        processedEventRepository.save(new NotificationProcessedEvent(
                "evt-repo-202", "notification-events-consumer", "OrderConfirmed", "corr-repo-202"));

        assertThat(notificationRepository.findByTrackingNumberIgnoreCaseOrderByCreatedAtAsc("SD-20202")).hasSize(1);
        assertThat(contactRepository.findByTrackingNumberIgnoreCase("SD-20202")).isPresent();
        assertThat(processedEventRepository.existsByEventIdAndConsumerGroup(
                "evt-repo-202", "notification-events-consumer")).isTrue();
    }
}

