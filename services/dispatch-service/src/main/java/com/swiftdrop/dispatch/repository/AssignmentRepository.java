package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    List<Assignment> findByOrderId(Long orderId);

    List<Assignment> findByCourier(Courier courier);

    List<Assignment> findByCourierId(Long courierId);

    List<Assignment> findByStatus(AssignmentStatus status);

    List<Assignment> findByCourierIdAndStatus(Long courierId, AssignmentStatus status);

    List<Assignment> findByCourierIdAndStatusIn(Long courierId, Collection<AssignmentStatus> statuses);

    long countByCourierIdAndStatusIn(Long courierId, Collection<AssignmentStatus> statuses);

    boolean existsByOrderIdAndStatusIn(Long orderId, Collection<AssignmentStatus> statuses);

    Optional<Assignment> findByAssignmentCode(String assignmentCode);

    @Query("""
        SELECT DISTINCT a.orderId
        FROM Assignment a
        WHERE a.orderId IN :orderIds
        AND a.status IN :statuses
        """)
    Set<Long> findActiveOrderIdsByOrderIdIn(
        @Param("orderIds") Collection<Long> orderIds,
        @Param("statuses") Collection<AssignmentStatus> statuses
    );
}
