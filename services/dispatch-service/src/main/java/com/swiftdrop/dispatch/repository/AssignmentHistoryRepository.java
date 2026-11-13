package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.AssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentHistoryRepository extends JpaRepository<AssignmentHistory, Long> {

    List<AssignmentHistory> findByAssignment(Assignment assignment);

    List<AssignmentHistory> findByAssignmentId(Long assignmentId);

    List<AssignmentHistory> findByAssignmentIdOrderByChangedAtAsc(Long assignmentId);

    List<AssignmentHistory> findByAssignmentIdOrderByChangedAtDesc(Long assignmentId);

    List<AssignmentHistory> findByChangedBy(Long changedBy);
}

