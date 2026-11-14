package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.DispatchProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DispatchProcessedEventRepository extends JpaRepository<DispatchProcessedEvent, Long> {

    boolean existsByEventIdAndConsumerGroup(String eventId, String consumerGroup);
}

