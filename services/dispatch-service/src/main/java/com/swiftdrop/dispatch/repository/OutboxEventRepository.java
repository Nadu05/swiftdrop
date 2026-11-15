package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.OutboxEvent;
import com.swiftdrop.dispatch.entity.enums.OutboxStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    Optional<OutboxEvent> findByEventId(String eventId);

    List<OutboxEvent> findByStatusOrderByOccurredAtAsc(OutboxStatus status);

    @Query("""
        SELECT e FROM OutboxEvent e
        WHERE e.status IN :statuses
          AND e.retryCount < e.maxRetries
        ORDER BY e.occurredAt ASC
        """)
    List<OutboxEvent> findPendingForProcessing(
        @Param("statuses") Collection<OutboxStatus> statuses,
        Pageable pageable
    );
}

