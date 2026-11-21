package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.OrderOutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderOutboxEventRepository extends JpaRepository<OrderOutboxEvent, Long> {

    Optional<OrderOutboxEvent> findByEventId(String eventId);

    List<OrderOutboxEvent> findTop50ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            String status,
            LocalDateTime cutoff
    );

    List<OrderOutboxEvent> findByAggregateIdOrderByCreatedAtAsc(String aggregateId);
}

