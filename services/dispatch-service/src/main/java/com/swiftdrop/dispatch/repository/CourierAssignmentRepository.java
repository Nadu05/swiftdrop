package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.CourierAssignment;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CourierAssignmentRepository extends JpaRepository<CourierAssignment, Long> {

    Optional<CourierAssignment> findByAssignmentCodeIgnoreCase(String assignmentCode);

    List<CourierAssignment> findByCourierIdOrderByAssignedAtDesc(Long courierId);

    List<CourierAssignment> findByBranchIdOrderByAssignedAtDesc(Long branchId);

    List<CourierAssignment> findAllByOrderByAssignedAtDesc();

    List<CourierAssignment> findByOrderIdOrderByAssignedAtDesc(String orderId);

    List<CourierAssignment> findByDeliveryJobIdOrderByAssignedAtDesc(Long deliveryJobId);

    List<CourierAssignment> findByPickupTaskIdOrderByAssignedAtDesc(Long pickupTaskId);

    @Query("SELECT COUNT(a) FROM CourierAssignment a WHERE a.courier.id = :courierId AND a.status IN :activeStatuses")
    long countByCourierIdAndStatusIn(
            @Param("courierId") Long courierId,
            @Param("activeStatuses") Collection<AssignmentStatus> activeStatuses
    );

    boolean existsByAssignmentCodeIgnoreCase(String assignmentCode);
}
