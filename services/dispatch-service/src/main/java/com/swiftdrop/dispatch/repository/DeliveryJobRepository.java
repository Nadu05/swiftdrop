package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.DeliveryJob;
import com.swiftdrop.dispatch.entity.enums.DeliveryJobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryJobRepository extends JpaRepository<DeliveryJob, Long> {

    Optional<DeliveryJob> findByJobCodeIgnoreCase(String jobCode);

    Optional<DeliveryJob> findByOrderId(String orderId);

    Optional<DeliveryJob> findByTrackingNumberIgnoreCase(String trackingNumber);

    List<DeliveryJob> findByBranchIdOrderByCreatedAtDesc(Long branchId);

    List<DeliveryJob> findByBranchIdAndStatusOrderByCreatedAtDesc(Long branchId, DeliveryJobStatus status);

    List<DeliveryJob> findByStatusOrderByCreatedAtDesc(DeliveryJobStatus status);

    List<DeliveryJob> findAllByOrderByCreatedAtDesc();

    boolean existsByOrderId(String orderId);

    boolean existsByTrackingNumberIgnoreCase(String trackingNumber);
}

