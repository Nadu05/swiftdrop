package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderLifecycleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryOrderRepository extends JpaRepository<DeliveryOrder, Long> {

    boolean existsByTrackingNumberIgnoreCase(String trackingNumber);

    Optional<DeliveryOrder> findByTrackingNumberIgnoreCase(String trackingNumber);

    List<DeliveryOrder> findByCustomerUserIdOrderByCreatedAtDesc(String customerUserId);

    List<DeliveryOrder> findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(String customerEmail);

    List<DeliveryOrder> findByMerchantOrganizationIdOrderByCreatedAtDesc(String merchantOrganizationId);

    List<DeliveryOrder> findByAssignedCourierIdOrderByCreatedAtDesc(String assignedCourierId);

    List<DeliveryOrder> findByOriginBranchIdOrDestinationBranchIdOrderByCreatedAtDesc(
            Long originBranchId,
            Long destinationBranchId
    );

    List<DeliveryOrder> findByStatusOrderByCreatedAtDesc(OrderLifecycleStatus status);

    List<DeliveryOrder> findAllByOrderByCreatedAtDesc();
}
