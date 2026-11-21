package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.ReturnTask;
import com.swiftdrop.dispatch.entity.enums.ReturnTaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReturnTaskRepository extends JpaRepository<ReturnTask, Long> {

    Optional<ReturnTask> findByReturnCodeIgnoreCase(String returnCode);

    Optional<ReturnTask> findFirstByOrderIdOrderByCreatedAtDesc(String orderId);

    Optional<ReturnTask> findFirstByTrackingNumberIgnoreCaseOrderByCreatedAtDesc(String trackingNumber);

    boolean existsByReturnCodeIgnoreCase(String returnCode);

    boolean existsByOrderIdAndStatusNot(String orderId, ReturnTaskStatus excludedStatus);

    @Query("SELECT r FROM ReturnTask r WHERE r.currentBranchId = :branchId OR r.originBranchId = :branchId ORDER BY r.createdAt DESC")
    List<ReturnTask> findByCurrentOrOriginBranchOrderByCreatedAtDesc(@Param("branchId") Long branchId);

    List<ReturnTask> findByAssignedCourierIdOrderByCreatedAtDesc(Long courierId);

    List<ReturnTask> findByStatusOrderByCreatedAtDesc(ReturnTaskStatus status);

    List<ReturnTask> findAllByOrderByCreatedAtDesc();
}

