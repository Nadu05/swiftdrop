package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.OrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {

    List<OrderStatusHistory> findByOrderIdOrderByCreatedAtAsc(Long orderId);

    /** Timeline order: oldest first, with the id as tie-breaker so entries with equal timestamps stay stable. */
    List<OrderStatusHistory> findByOrderIdOrderByCreatedAtAscIdAsc(Long orderId);
}
