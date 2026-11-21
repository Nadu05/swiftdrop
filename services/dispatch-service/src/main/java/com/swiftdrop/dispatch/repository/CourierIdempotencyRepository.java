package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.CourierIdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CourierIdempotencyRepository extends JpaRepository<CourierIdempotencyRecord, Long> {

    Optional<CourierIdempotencyRecord> findByActorIdAndIdempotencyKey(String actorId, String idempotencyKey);
}
