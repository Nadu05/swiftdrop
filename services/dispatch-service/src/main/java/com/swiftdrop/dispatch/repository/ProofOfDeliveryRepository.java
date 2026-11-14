package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.ProofOfDelivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProofOfDeliveryRepository extends JpaRepository<ProofOfDelivery, Long> {

    Optional<ProofOfDelivery> findByDeliveryJobId(Long deliveryJobId);

    Optional<ProofOfDelivery> findByOrderId(String orderId);

    Optional<ProofOfDelivery> findByTrackingNumberIgnoreCase(String trackingNumber);
}

