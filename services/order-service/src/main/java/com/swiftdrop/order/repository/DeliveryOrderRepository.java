package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryOrderRepository extends JpaRepository<DeliveryOrder, Long> {

    /** Ownership-safe lookup: returns empty when the order belongs to another customer. */
    Optional<DeliveryOrder> findByIdAndCustomerId(Long id, Long customerId);

    /** Used for idempotent order creation. */
    Optional<DeliveryOrder> findByCustomerIdAndIdempotencyKey(Long customerId, String idempotencyKey);

    boolean existsByTrackingNumber(String trackingNumber);

    /** Public tracking lookup. The caller must only ever expose the safe tracking view of the result. */
    Optional<DeliveryOrder> findByTrackingNumber(String trackingNumber);

    /** Orders in one status, oldest first (id breaks ties so the order is stable). */
    List<DeliveryOrder> findByStatusOrderByCreatedAtAscIdAsc(OrderStatus status, Pageable pageable);

    /** Same, restricted to one branch. */
    List<DeliveryOrder> findByStatusAndBranchIdOrderByCreatedAtAscIdAsc(OrderStatus status, Long branchId, Pageable pageable);

    /**
     * Loads the order and locks its row until the transaction ends, so two status changes on the same
     * order are applied one after the other and each is checked against the real current status.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from DeliveryOrder o where o.id = :id")
    Optional<DeliveryOrder> findByIdForUpdate(@Param("id") Long id);

    /** One customer's orders only; the caller supplies the paging and sort. */
    Page<DeliveryOrder> findByCustomerId(Long customerId, Pageable pageable);
}
