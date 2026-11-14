package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Courier-scoped, read-only queries on assignments for the courier portal.
 * Every query is filtered by courier id so a courier can only ever see or change their own jobs.
 */
@Repository
public interface CourierAssignmentRepository extends JpaRepository<Assignment, Long> {

    @Query("""
        SELECT a FROM Assignment a
        WHERE a.courier.id = :courierId
        AND a.status IN :statuses
        ORDER BY a.assignedAt DESC, a.id DESC
        """)
    List<Assignment> findCourierJobs(
            @Param("courierId") Long courierId,
            @Param("statuses") Collection<AssignmentStatus> statuses,
            Pageable pageable);

    /** The job only if it belongs to this courier. Status changes go through AssignmentService, not here. */
    @Query("SELECT a FROM Assignment a WHERE a.id = :id AND a.courier.id = :courierId")
    Optional<Assignment> findOwnJob(@Param("id") Long id, @Param("courierId") Long courierId);
}
