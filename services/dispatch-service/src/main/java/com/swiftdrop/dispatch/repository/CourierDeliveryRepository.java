package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.CourierDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CourierDeliveryRepository extends JpaRepository<CourierDelivery, Long> {

    Optional<CourierDelivery> findByAssignmentId(Long assignmentId);

    List<CourierDelivery> findByAssignmentIdIn(Collection<Long> assignmentIds);
}
