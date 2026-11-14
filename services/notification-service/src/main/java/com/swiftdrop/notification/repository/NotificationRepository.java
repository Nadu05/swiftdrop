package com.swiftdrop.notification.repository;

import com.swiftdrop.notification.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    Optional<NotificationEntity> findByNotificationCodeIgnoreCase(String notificationCode);

    List<NotificationEntity> findAllByOrderByCreatedAtDesc();

    List<NotificationEntity> findByRecipientUserIdOrderByCreatedAtDesc(String recipientUserId);

    List<NotificationEntity> findByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(String recipientEmail);

    List<NotificationEntity> findByTrackingNumberIgnoreCaseOrderByCreatedAtAsc(String trackingNumber);

    List<NotificationEntity> findByApplicationCodeIgnoreCaseOrderByCreatedAtDesc(String applicationCode);

    List<NotificationEntity> findByStatusOrderByCreatedAtAsc(String status);
}

