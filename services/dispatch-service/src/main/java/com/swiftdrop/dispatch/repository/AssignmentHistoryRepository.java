package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.AssignmentHistoryRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentHistoryRepository extends JpaRepository<AssignmentHistoryRecord, Long> {

    List<AssignmentHistoryRecord> findByAssignmentIdOrderByRecordedAtAsc(Long assignmentId);
}

