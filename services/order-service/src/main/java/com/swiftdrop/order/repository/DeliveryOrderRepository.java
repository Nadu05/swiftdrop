package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.DeliveryOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeliveryOrderRepository extends JpaRepository<DeliveryOrder, Long> {

    /** Ownership-safe lookup: returns empty when the order belongs to another customer. */
    Optional<DeliveryOrder> findByIdAndCustomerId(Long id, Long customerId);

    /** Used for idempotent order creation. */
    Optional<DeliveryOrder> findByCustomerIdAndIdempotencyKey(Long customerId, String idempotencyKey);

    boolean existsByTrackingNumber(String trackingNumber);
}
