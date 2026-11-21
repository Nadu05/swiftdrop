package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.DeliveryAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryAttemptRepository extends JpaRepository<DeliveryAttempt, Long> {

    List<DeliveryAttempt> findByDeliveryJobIdOrderByAttemptNumberAsc(Long deliveryJobId);

    List<DeliveryAttempt> findByOrderIdOrderByAttemptNumberAsc(String orderId);

    long countByDeliveryJobId(Long deliveryJobId);
}

