package com.swiftdrop.notification.repository;

import com.swiftdrop.notification.entity.NotificationOrderContact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationOrderContactRepository extends JpaRepository<NotificationOrderContact, Long> {

    Optional<NotificationOrderContact> findByTrackingNumberIgnoreCase(String trackingNumber);

    Optional<NotificationOrderContact> findByOrderId(String orderId);
}

