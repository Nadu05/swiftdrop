package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.OrganizationOutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrganizationOutboxEventRepository extends JpaRepository<OrganizationOutboxEvent, Long> {

    Optional<OrganizationOutboxEvent> findByEventId(String eventId);

    List<OrganizationOutboxEvent> findTop50ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            String status,
            LocalDateTime cutoff
    );

    List<OrganizationOutboxEvent> findByAggregateIdOrderByCreatedAtAsc(String aggregateId);
}

