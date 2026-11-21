package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.DispatchOutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface DispatchOutboxEventRepository extends JpaRepository<DispatchOutboxEvent, Long> {

    Optional<DispatchOutboxEvent> findByEventId(String eventId);

    List<DispatchOutboxEvent> findTop50ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            String status,
            LocalDateTime cutoff
    );

    List<DispatchOutboxEvent> findByAggregateIdOrderByCreatedAtAsc(String aggregateId);
}

