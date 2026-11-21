package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.PickupTask;
import com.swiftdrop.dispatch.entity.enums.PickupTaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PickupTaskRepository extends JpaRepository<PickupTask, Long> {

    Optional<PickupTask> findByTaskCodeIgnoreCase(String taskCode);

    Optional<PickupTask> findByOrderId(String orderId);

    Optional<PickupTask> findByTrackingNumberIgnoreCase(String trackingNumber);

    List<PickupTask> findByOriginBranchIdOrderByCreatedAtDesc(Long originBranchId);

    List<PickupTask> findByOriginBranchIdAndStatusOrderByCreatedAtDesc(Long originBranchId, PickupTaskStatus status);

    List<PickupTask> findByOriginBranchIdAndSameBranchFalseOrderByCreatedAtDesc(Long originBranchId);

    List<PickupTask> findBySameBranchFalseOrderByCreatedAtDesc();

    List<PickupTask> findAllByOrderByCreatedAtDesc();

    boolean existsByOrderId(String orderId);

    boolean existsByTrackingNumberIgnoreCase(String trackingNumber);
}

