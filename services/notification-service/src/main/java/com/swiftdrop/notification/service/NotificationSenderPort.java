package com.swiftdrop.notification.service;

import com.swiftdrop.notification.entity.NotificationEntity;

public interface NotificationSenderPort {

    void send(NotificationEntity notification);
}

