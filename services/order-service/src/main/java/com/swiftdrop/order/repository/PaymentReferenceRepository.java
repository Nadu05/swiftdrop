package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.PaymentReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentReferenceRepository extends JpaRepository<PaymentReference, Long> {
    List<PaymentReference> findByOrderIdOrderByCreatedAtAscIdAsc(Long orderId);
}

