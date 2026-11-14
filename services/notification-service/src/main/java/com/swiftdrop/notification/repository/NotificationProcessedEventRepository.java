package com.swiftdrop.notification.repository;

import com.swiftdrop.notification.entity.NotificationProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationProcessedEventRepository extends JpaRepository<NotificationProcessedEvent, Long> {

    boolean existsByEventIdAndConsumerGroup(String eventId, String consumerGroup);
}

